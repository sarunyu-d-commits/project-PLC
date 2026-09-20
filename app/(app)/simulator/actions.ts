"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  checkSimAction,
  findFault,
  SIM_TARGET_STATUS,
  type SimAction,
} from "@/lib/domain/simulator";
import { MACHINE_STATUS_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/validation";
import type { ActionState, MachineStatus } from "@/lib/types";

const ACTIONS: SimAction[] = ["start", "stop", "maintenance", "fault"];

export async function simulate(machineId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);

  const action = formData.get("action");
  if (typeof action !== "string" || !ACTIONS.includes(action as SimAction)) {
    return { ok: false, message: "คำสั่งไม่ถูกต้อง" };
  }
  const act = action as SimAction;

  const supabase = await createClient();
  const [{ data: machine }, { count }] = await Promise.all([
    supabase.from("machines").select("id, machine_code, status, plc_linked").eq("id", machineId).maybeSingle(),
    supabase
      .from("alarms")
      .select("id", { count: "exact", head: true })
      .eq("machine_id", machineId)
      .neq("status", "closed"),
  ]);
  if (!machine) return { ok: false, message: "ไม่พบเครื่องนี้" };

  const reason = checkSimAction(act, {
    status: machine.status as MachineStatus,
    plcLinked: machine.plc_linked as boolean,
    openAlarms: count ?? 0,
  });
  if (reason) return { ok: false, message: reason };

  let message: string;
  if (act === "fault") {
    const fault = findFault(formData.get("fault") as string | null);
    if (!fault) return { ok: false, message: "กรุณาเลือกชนิด Fault" };

    const { error } = await supabase.from("alarms").insert({
      machine_id: machine.id,
      alarm_code: fault.code,
      description: `${fault.description} (จำลอง)`,
      severity: fault.severity,
      source: "sim",
    });
    if (error) {
      return {
        ok: false,
        message: error.code === "23505" ? `${fault.code} ยังค้างอยู่ที่เครื่องนี้ ปิด Alarm เดิมก่อนจำลองซ้ำ` : dbErrorMessage(error),
      };
    }
    message = `สร้าง Alarm ${fault.code} แล้ว เครื่องเปลี่ยนเป็น Alarm`;
  } else {
    const target = SIM_TARGET_STATUS[act];
    const { data, error } = await supabase
      .from("machines")
      .update({ status: target })
      .eq("id", machine.id)
      .eq("plc_linked", false)
      .select("id");
    if (error) return { ok: false, message: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, message: "เปลี่ยนสถานะไม่สำเร็จ" };
    message = `${machine.machine_code} เป็น ${MACHINE_STATUS_LABEL[target]} แล้ว`;
  }

  revalidatePath("/simulator");
  revalidatePath("/dashboard");
  revalidatePath("/machines");
  revalidatePath("/alarms");
  return { ok: true, message };
}
