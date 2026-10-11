import { publicUploadUrl } from "../../middleware/upload";
import { escapeHtml } from "../../utils/mailer";
import type { Department } from "../departments/departments.model";
import type { Grievance } from "./grievances.model";

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export function grievanceEmailSubject(grievance: Grievance, department: Department): string {
  const place = grievance.village ? ` – ${grievance.village}` : "";
  return `[${grievance.ticketNo}] ${department.nameEn} complaint${place}`;
}

export function grievanceEmailHtml(grievance: Grievance, department: Department, message?: string): string {
  const photoUrl = publicUploadUrl(grievance.photoPath);
  const rows: [string, string][] = [
    ["Ticket No.", grievance.ticketNo],
    ["Received on", formatDate(grievance.createdAt)],
    ["Citizen name", grievance.name],
    ["Mobile", grievance.mobile],
    ["Village / Panchayat", grievance.village ?? "—"],
    ["Full address", grievance.address],
    ["Department", `${department.nameEn} / ${department.nameHi}`],
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#6b7280;width:170px;vertical-align:top">${escapeHtml(label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#111827;font-weight:600">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const note = message
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:#fff7ed;border-left:4px solid #e85c1c;border-radius:6px;color:#7c2d12">
         <strong>Note from MLA office:</strong><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}
       </div>`
    : "";

  const photo = photoUrl
    ? `<p style="margin:16px 0 0;color:#374151">Photo submitted by citizen (also attached): <a href="${escapeHtml(photoUrl)}" style="color:#e85c1c">View photo</a></p>`
    : "";

  return `
  <div style="background:#f6f4f1;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eee">
      <div style="background:#e85c1c;color:#fff;padding:18px 24px">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.9">Office of Pawan Jaiswal</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">Citizen grievance – action requested</div>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 16px;color:#374151">Respected ${escapeHtml(department.contactPerson || "Sir/Madam")},</p>
        <p style="margin:0 0 20px;color:#374151">The following grievance has been received from a citizen. Kindly take the necessary action and share the status with our office, quoting the ticket number.</p>
        ${note}
        <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #eee;border-radius:8px">${tableRows}</table>
        <h3 style="margin:24px 0 8px;font-size:15px;color:#111827">Problem described by citizen</h3>
        <div style="padding:14px 16px;background:#f9fafb;border-radius:8px;color:#111827;line-height:1.6">${escapeHtml(grievance.description).replace(/\n/g, "<br/>")}</div>
        ${photo}
        <p style="margin:24px 0 0;color:#6b7280;font-size:13px">Regards,<br/>Office of Pawan Jaiswal</p>
      </div>
    </div>
  </div>`;
}
