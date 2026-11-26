import { PRIVACY_POINTS } from "../legal";
import { allSources } from "../sources";

const link = "text-violet-300 underline underline-offset-2 hover:text-violet-200";

export default function PrivacyNotice() {
  return (
    <div className="space-y-2 text-[11px] leading-relaxed text-zinc-400">
      <ul className="list-disc space-y-1 pl-4">
        {PRIVACY_POINTS.map((point) => <li key={point}>{point}</li>)}
      </ul>
      {allSources.filter((s) => s.terms).map((s) => (
        <p key={s.id}>
          {s.name} : <a className={link} href={s.terms.termsUrl} target="_blank">conditions d’utilisation</a>
          {" · "}
          <a className={link} href={s.terms.privacyUrl} target="_blank">confidentialité</a>
        </p>
      ))}
    </div>
  );
}
