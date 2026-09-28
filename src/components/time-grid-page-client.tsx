"use client";

import { useMemo, useState } from "react";
import TimeGridLegendFilters from "@/components/time-grid-legend-filters";

type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

type AppointmentItem = {
  id: string;
  status: AppointmentStatus;
};

type Props<TEmployeesView, TRoomsView> = {
  selectedView: "employees" | "rooms";
  employeesView: TEmployeesView | null;
  roomsView: TRoomsView | null;
  render: (args: {
    filteredEmployeesView: TEmployeesView | null;
    filteredRoomsView: TRoomsView | null;
    filtersBar: React.ReactNode;
  }) => React.ReactNode;
};

function filterAppointmentsArray<T extends AppointmentItem>(
  items: T[],
  filters: {
    showScheduled: boolean;
    showCompleted: boolean;
    showCancelled: boolean;
    showNoShow: boolean;
  },
) {
  return items.filter((item) => {
    if (item.status === "scheduled") return filters.showScheduled;
    if (item.status === "completed") return filters.showCompleted;
    if (item.status === "cancelled") return filters.showCancelled;
    if (item.status === "no_show") return filters.showNoShow;
    return true;
  });
}

export default function TimeGridPageClient<
  TEmployeesView extends { appointments: AppointmentItem[] },
  TRoomsView extends { appointments: AppointmentItem[] },
>({ employeesView, roomsView, render }: Props<TEmployeesView, TRoomsView>) {
  const [showScheduled] = useState(true);
  const [showCompleted] = useState(true);
  const [showCancelled] = useState(true);
  const [showNoShow] = useState(true);

  const filteredEmployeesView = useMemo(() => {
    if (!employeesView) return null;

    return {
      ...employeesView,
      appointments: filterAppointmentsArray(employeesView.appointments, {
        showScheduled,
        showCompleted,
        showCancelled,
        showNoShow,
      }),
    };
  }, [employeesView, showScheduled, showCompleted, showCancelled, showNoShow]);

  const filteredRoomsView = useMemo(() => {
    if (!roomsView) return null;

    return {
      ...roomsView,
      appointments: filterAppointmentsArray(roomsView.appointments, {
        showScheduled,
        showCompleted,
        showCancelled,
        showNoShow,
      }),
    };
  }, [roomsView, showScheduled, showCompleted, showCancelled, showNoShow]);

  const filtersBar = (
    <TimeGridLegendFilters
      showScheduled={showScheduled}
      showCompleted={showCompleted}
      showCancelled={showCancelled}
      showNoShow={showNoShow}
    />
  );

  return render({
    filteredEmployeesView,
    filteredRoomsView,
    filtersBar,
  });
}
