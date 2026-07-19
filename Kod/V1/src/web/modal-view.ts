import type { Salon } from "../db/schema.js";
import type { Tx, DayAppointment } from "../db/queries.js";
import { activeServices, activeStaff, clientById } from "../db/queries.js";
import { minutesInTz, minutesToHm } from "../lib/time.js";

export type ModalService = { id: string; name: string; durationMin: number; priceDinars: number };
export type ModalStaff = { id: string; name: string; color: string };
export type ClientMode = "search" | "selected" | "new";

export type ModalContext = {
  slug: string;
  mode: "new" | "edit";
  actionUrl: string;
  apptId: string | null;
  date: string;
  startHm: string;
  durationMin: number;
  services: ModalService[];
  staffList: ModalStaff[];
  clientMode: ClientMode;
  selectedClient: { id: string; name: string; phone: string } | null;
  newClient: { name: string; phone: string };
  values: {
    serviceId: string;
    staffId: string;
    priceDinars: string;
    note: string;
  };
  errors: Record<string, string>;
};

async function catalog(tx: Tx, salon: Salon) {
  const [svc, stf] = await Promise.all([activeServices(tx, salon.id), activeStaff(tx, salon.id)]);
  return {
    services: svc.map<ModalService>((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.defaultDurationMin,
      priceDinars: Math.round(s.defaultPrice / 100),
    })),
    staffList: stf.map<ModalStaff>((s) => ({ id: s.id, name: s.fullName, color: s.color })),
  };
}

export async function buildNewModal(
  tx: Tx,
  salon: Salon,
  start: string, // 'YYYY-MM-DDTHH:MM'
): Promise<ModalContext> {
  const [date, startHm = "09:00"] = start.split("T");
  const { services, staffList } = await catalog(tx, salon);
  return {
    slug: salon.slug,
    mode: "new",
    actionUrl: `/s/${salon.slug}/appointments`,
    apptId: null,
    date: date!,
    startHm,
    durationMin: services[0]?.durationMin ?? 30,
    services,
    staffList,
    clientMode: "search",
    selectedClient: null,
    newClient: { name: "", phone: "" },
    values: { serviceId: "", staffId: "", priceDinars: "", note: "" },
    errors: {},
  };
}

export async function buildEditModal(
  tx: Tx,
  salon: Salon,
  appt: DayAppointment,
): Promise<ModalContext> {
  const tz = salon.timezone;
  const { services, staffList } = await catalog(tx, salon);
  const client = appt.clientId ? await clientById(tx, salon.id, appt.clientId) : null;
  const startMin = minutesInTz(appt.startsAt, tz);
  const durationMin = Math.max(
    Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000),
    5,
  );
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(appt.startsAt); // YYYY-MM-DD

  return {
    slug: salon.slug,
    mode: "edit",
    actionUrl: `/s/${salon.slug}/appointments/${appt.id}`,
    apptId: appt.id,
    date,
    startHm: minutesToHm(startMin),
    durationMin,
    services,
    staffList,
    clientMode: client ? "selected" : "search",
    selectedClient: client ? { id: client.id, name: client.fullName, phone: client.phone } : null,
    newClient: { name: "", phone: "" },
    values: {
      serviceId: appt.serviceId,
      staffId: appt.staffId ?? "",
      priceDinars: String(Math.round(appt.price / 100)),
      note: appt.note ?? "",
    },
    errors: {},
  };
}

/** Re-render posle neuspešne validacije — zadržava sve unete vrednosti + greške. */
export async function errorModal(
  tx: Tx,
  salon: Salon,
  input: {
    mode: "new" | "edit";
    apptId: string | null;
    date: string;
    startHm: string;
    durationMin: number;
    clientMode: ClientMode;
    selectedClient: ModalContext["selectedClient"];
    newClient: { name: string; phone: string };
    values: ModalContext["values"];
    errors: Record<string, string>;
  },
): Promise<ModalContext> {
  const { services, staffList } = await catalog(tx, salon);
  return {
    slug: salon.slug,
    mode: input.mode,
    actionUrl:
      input.mode === "new"
        ? `/s/${salon.slug}/appointments`
        : `/s/${salon.slug}/appointments/${input.apptId}`,
    apptId: input.apptId,
    date: input.date,
    startHm: input.startHm,
    durationMin: input.durationMin,
    services,
    staffList,
    clientMode: input.clientMode,
    selectedClient: input.selectedClient,
    newClient: input.newClient,
    values: input.values,
    errors: input.errors,
  };
}
