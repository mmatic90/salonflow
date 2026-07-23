import {
  createSetupEmployeeAction,
  createSetupRoomAction,
  createSetupServiceAction,
} from "@/features/setup/actions";

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/15";
const buttonClass =
  "inline-flex w-full items-center justify-center rounded-xl bg-app-accent px-4 py-3 font-semibold text-white transition hover:opacity-90";

export default function SetupForms() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        action={createSetupEmployeeAction}
        className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold text-app-text">Zaposlenik</h2>
          <p className="mt-1 text-sm text-app-muted">
            Dodaj osobu kojoj se mogu dodijeliti termini.
          </p>
        </div>
        <input
          className={fieldClass}
          name="first_name"
          placeholder="Ime"
          required
        />
        <input
          className={fieldClass}
          name="last_name"
          placeholder="Prezime"
        />
        <label className="block text-sm font-medium text-app-text">
          Boja u kalendaru
          <input
            className="mt-2 h-12 w-full rounded-xl border border-app-soft bg-white p-2"
            name="color"
            type="color"
            defaultValue="#776B5D"
          />
        </label>
        <button className={buttonClass} type="submit">
          Dodaj zaposlenika
        </button>
      </form>

      <form
        action={createSetupServiceAction}
        className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold text-app-text">Usluga</h2>
          <p className="mt-1 text-sm text-app-muted">
            Dodaj naziv, trajanje i opcionalnu cijenu.
          </p>
        </div>
        <input
          className={fieldClass}
          name="name"
          placeholder="Naziv usluge"
          required
        />
        <input
          className={fieldClass}
          name="duration_minutes"
          type="number"
          min="1"
          step="1"
          placeholder="Trajanje u minutama"
          required
        />
        <input
          className={fieldClass}
          name="price"
          type="number"
          min="0"
          step="0.01"
          placeholder="Cijena u EUR"
        />
        <button className={buttonClass} type="submit">
          Dodaj uslugu
        </button>
      </form>

      <form
        action={createSetupRoomAction}
        className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold text-app-text">Soba</h2>
          <p className="mt-1 text-sm text-app-muted">
            Soba nije obavezna za termin, ali pomaže organizaciji.
          </p>
        </div>
        <input
          className={fieldClass}
          name="name"
          placeholder="Naziv sobe"
          required
        />
        <button className={buttonClass} type="submit">
          Dodaj sobu
        </button>
      </form>
    </div>
  );
}
