import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "../../components/ui/button";

export function PrivacyFooter() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <footer className="border-t border-slate-200 bg-white/95">
        <div className="flex w-full flex-col gap-2 px-4 py-2 text-[11px] leading-4 text-slate-700 md:px-6">
          <div className="grid gap-4 md:grid-cols-3 md:items-start md:justify-items-center">
            <div className="w-full max-w-[420px]">
              <div className="mb-1 font-semibold">Suomi</div>
              <ul className="space-y-1">
                <li>Offline: tiedot tallentuvat vain tahan selaimeen (IndexedDB).</li>
                <li>Sovellus ei laheta tietoja verkkoon.</li>
                <li>Ala syota henkilotietoja tai arkaluontoista dataa. Kayta tunnisteita (esim. T1, T2).</li>
                <li>Muista varmuuskopio Export-toiminnolla.</li>
              </ul>
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Info size={14} />
                  Tietosuoja & Offline
                </button>
              </div>
            </div>
            <div className="w-full max-w-[420px]">
              <div className="mb-1 font-semibold">English</div>
              <ul className="space-y-1">
                <li>Offline: data is stored only in this browser (IndexedDB).</li>
                <li>The app does not send data to the network.</li>
                <li>Do not enter personal or sensitive data. Use identifiers (for example T1, T2).</li>
                <li>Remember to back up using Export.</li>
              </ul>
            </div>
            <div className="w-full max-w-[420px]">
              <div className="mb-1 font-semibold">Made by Antsa</div>
              <ul className="space-y-1 text-slate-700">
                <li>A good vacation schedule isn&apos;t seen, it&apos;s felt.</li>
                <li>That&apos;s why every name on the list matters.</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tietosuoja and Privacy Offline information"
            className="w-full max-w-3xl rounded-2xl border border-border bg-white p-4 shadow-2xl md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Tietosuoja & Offline / Privacy & Offline</h2>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                <X size={14} className="mr-1" /> Close
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div className="font-semibold">Suomi</div>
                <ul className="list-disc space-y-1 pl-5 text-slate-700">
                  <li>
                    Tama sovellus toimii offline-first: kaikki syottamasi tiedot tallennetaan
                    vain taman selaimen paikalliseen tietokantaan (IndexedDB).
                  </li>
                  <li>
                    Sovellus ei laheta tai tallenna tietoja palvelimelle eika kayta analytiikkaa.
                  </li>
                  <li>
                    Ala syota henkilotietoja tai arkaluontoista dataa (esim. taydet nimet,
                    henkilotunnukset, terveystiedot). Suosittelemme kayttamaan tunnisteita (T1,
                    T2) tai nimikirjaimia.
                  </li>
                  <li>
                    Paikallinen data voi kadota, jos selaimen data tyhjennetaan tai tyopaikan
                    profiili nollautuu. Kayta Export/Import-toimintoa varmuuskopiointiin.
                  </li>
                  <li>Vastuu syotetysta sisallosta on kayttajalla.</li>
                </ul>
              </div>

              <div className="space-y-2 text-sm">
                <div className="font-semibold">English</div>
                <ul className="list-disc space-y-1 pl-5 text-slate-700">
                  <li>
                    This app is offline-first: all entered data is stored only in this browser
                    (IndexedDB).
                  </li>
                  <li>
                    The app does not send or store data to a server and does not use analytics.
                  </li>
                  <li>
                    Do not enter personal or sensitive data (for example full names, national ID
                    numbers, or health data). Use identifiers like T1, T2, or initials.
                  </li>
                  <li>
                    Local data may be lost if browser data is cleared or the work profile is reset.
                    Use Export/Import for backups.
                  </li>
                  <li>The user is responsible for the content they enter.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
