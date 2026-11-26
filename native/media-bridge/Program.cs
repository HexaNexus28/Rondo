// Bridge between Rondo and Windows media sessions (the panel shown by the keyboard media keys).
// stdout: one JSON line per change, {"sessions":[...]}. stdin: one JSON command per line, {"cmd":"next","id":"<app id>"}.
// Arguments: app ids to ignore (Rondo's own session). Exits when stdin closes, i.e. when Rondo quits.
using System.Text;
using System.Text.Json;
using Windows.Media.Control;
using Windows.Storage.Streams;

using MediaManager = Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager;
using Session = Windows.Media.Control.GlobalSystemMediaTransportControlsSession;
using Status = Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus;

const int PUBLISH_DEBOUNCE_MS = 100;
const long TICKS_PER_MS = 10_000;

var ignored = new HashSet<string>(args, StringComparer.OrdinalIgnoreCase);
var manager = await MediaManager.RequestAsync();
var hooked = new HashSet<string>();
var covers = new Dictionary<string, (string Key, string? DataUrl)>();
var gate = new SemaphoreSlim(1, 1);
var stdout = Console.OpenStandardOutput();
CancellationTokenSource? pending = null;

IEnumerable<Session> Sessions() => manager.GetSessions().Where(s => !ignored.Contains(s.SourceAppUserModelId));

// Many events fire together (a track change sends properties, playback and timeline): publish once.
void Schedule()
{
    pending?.Cancel();
    var cts = pending = new CancellationTokenSource();
    _ = Task.Delay(PUBLISH_DEBOUNCE_MS, cts.Token).ContinueWith(t => { if (!t.IsCanceled) _ = Publish(); });
}

void Hook(Session s)
{
    if (!hooked.Add(s.SourceAppUserModelId)) return;
    s.MediaPropertiesChanged += (_, _) => Schedule();
    s.PlaybackInfoChanged += (_, _) => Schedule();
    s.TimelinePropertiesChanged += (_, _) => Schedule();
}

void HookAll()
{
    foreach (var s in Sessions()) Hook(s);
}

async Task<string?> Cover(string id, string key, IRandomAccessStreamReference? thumbnail)
{
    if (covers.TryGetValue(id, out var cached) && cached.Key == key) return cached.DataUrl;
    string? dataUrl = null;
    if (thumbnail != null)
    {
        try
        {
            using var stream = await thumbnail.OpenReadAsync();
            using var reader = new DataReader(stream);
            await reader.LoadAsync((uint)stream.Size);
            var bytes = new byte[stream.Size];
            reader.ReadBytes(bytes);
            var type = string.IsNullOrEmpty(stream.ContentType) ? "image/png" : stream.ContentType;
            dataUrl = $"data:{type};base64,{Convert.ToBase64String(bytes)}";
        }
        catch (Exception) { /* some apps expose a thumbnail they cannot open: show none */ }
    }
    covers[id] = (key, dataUrl);
    return dataUrl;
}

static string StatusName(Status s) => s switch
{
    Status.Playing => "playing",
    Status.Paused => "paused",
    Status.Stopped => "stopped",
    _ => "idle",
};

async Task Publish()
{
    await gate.WaitAsync();
    try
    {
        using var buffer = new MemoryStream();
        using (var json = new Utf8JsonWriter(buffer))
        {
            json.WriteStartObject();
            json.WriteString("current", manager.GetCurrentSession()?.SourceAppUserModelId);
            json.WriteStartArray("sessions");
            foreach (var s in Sessions())
            {
                GlobalSystemMediaTransportControlsSessionMediaProperties? props = null;
                try { props = await s.TryGetMediaPropertiesAsync(); }
                catch (Exception) { /* session closing while we read it */ }
                var playback = s.GetPlaybackInfo();
                var timeline = s.GetTimelineProperties();
                var id = s.SourceAppUserModelId;
                json.WriteStartObject();
                json.WriteString("id", id);
                json.WriteString("title", props?.Title ?? "");
                json.WriteString("artist", props?.Artist ?? "");
                json.WriteString("cover", await Cover(id, $"{props?.Title}\n{props?.Artist}", props?.Thumbnail));
                json.WriteString("status", StatusName(playback.PlaybackStatus));
                json.WriteBoolean("canToggle", playback.Controls.IsPlayPauseToggleEnabled);
                json.WriteBoolean("canNext", playback.Controls.IsNextEnabled);
                json.WriteBoolean("canPrev", playback.Controls.IsPreviousEnabled);
                json.WriteBoolean("canSeek", playback.Controls.IsPlaybackPositionEnabled);
                json.WriteNumber("position", timeline.Position.TotalSeconds);
                json.WriteNumber("duration", (timeline.EndTime - timeline.StartTime).TotalSeconds);
                json.WriteNumber("updatedAt", timeline.LastUpdatedTime.ToUnixTimeMilliseconds());
                json.WriteEndObject();
            }
            json.WriteEndArray();
            json.WriteEndObject();
        }
        buffer.WriteByte((byte)'\n');
        stdout.Write(buffer.GetBuffer(), 0, (int)buffer.Length);
        stdout.Flush();
    }
    finally
    {
        gate.Release();
    }
}

async Task Run(string line)
{
    using var doc = JsonDocument.Parse(line);
    var root = doc.RootElement;
    var cmd = root.GetProperty("cmd").GetString();
    var id = root.GetProperty("id").GetString();
    var session = Sessions().FirstOrDefault(s => s.SourceAppUserModelId == id);
    if (session == null) return;
    _ = cmd switch
    {
        "toggle" => await session.TryTogglePlayPauseAsync(),
        "pause" => await session.TryPauseAsync(),
        "next" => await session.TrySkipNextAsync(),
        "prev" => await session.TrySkipPreviousAsync(),
        "seek" => await session.TryChangePlaybackPositionAsync((long)(root.GetProperty("position").GetDouble() * 1000 * TICKS_PER_MS)),
        _ => false,
    };
}

manager.SessionsChanged += (_, _) => { HookAll(); Schedule(); };
manager.CurrentSessionChanged += (_, _) => Schedule();
HookAll();
await Publish();

using var stdin = new StreamReader(Console.OpenStandardInput(), Encoding.UTF8);
while (await stdin.ReadLineAsync() is { } line)
{
    try { await Run(line); }
    catch (Exception) { /* malformed command or app refusing it: nothing to report back */ }
}
