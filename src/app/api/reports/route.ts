import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { LEAVE_TYPE_LABEL, type LeaveRequest } from "@/types/domain";

export async function GET(request: NextRequest) {
  const admin = await requireRole("admin");
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fieldId = searchParams.get("fieldId");
  const format = searchParams.get("format");

  let query = adminDb
    .collection("leaveRequests")
    .where("contractId", "==", admin.contractId)
    .orderBy("createdAt", "desc") as FirebaseFirestore.Query;

  if (fieldId) query = query.where("fieldId", "==", fieldId);
  if (from) query = query.where("createdAt", ">=", new Date(from));
  if (to) query = query.where("createdAt", "<=", new Date(to));

  const snap = await query.limit(1000).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LeaveRequest, "id">) }));

  if (format === "csv") {
    const header = "Empleado,Cedula,Cargo,Tipo,FechaInicio,FechaFin,Dias,Horas,Remunerado,Estado,PDF\n";
    const body = rows
      .map((r) =>
        [
          r.employeeName,
          r.employeeCedula,
          r.position,
          LEAVE_TYPE_LABEL[r.type],
          r.startDate.toDate().toISOString().slice(0, 10),
          r.endDate.toDate().toISOString().slice(0, 10),
          r.numDays,
          r.numHours ?? "",
          r.isPaid ? "Si" : "No",
          r.status,
          r.pdf?.webViewLink ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte-ausentismos.csv"`,
      },
    });
  }

  const serialized = rows.map((r) => ({
    id: r.id,
    employeeName: r.employeeName,
    type: r.type,
    status: r.status,
    startDate: r.startDate.toDate().toISOString(),
    endDate: r.endDate.toDate().toISOString(),
  }));

  return NextResponse.json({ ok: true, data: serialized });
}
