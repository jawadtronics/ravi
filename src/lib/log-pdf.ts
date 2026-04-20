import { formatDateTime } from "@/lib/utils";
import { WheatLog } from "@/types/app";

type LogPdfOptions = {
  log: WheatLog;
  centerName?: string | null;
  gatePersonName?: string | null;
  weightManagerName?: string | null;
  fileName?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  const text = String(value).trim();
  return text ? text : "-";
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  );
}

async function toDataUrl(url: string) {
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) {
      return url;
    }

    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : url);
      };
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

function renderPictureBox(label: string, url: string | null) {
  if (!url) {
    return `<div style="width:38mm;height:38mm;border:1px solid #111827;display:flex;align-items:center;justify-content:center;font-size:12px;color:#374151;">${escapeHtml(label)}</div>`;
  }

  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" crossorigin="anonymous" style="width:38mm;height:38mm;border:1px solid #111827;object-fit:cover;" />`;
}

export async function downloadWheatLogPdf({ log, centerName, gatePersonName, weightManagerName, fileName }: LogPdfOptions) {
  if (typeof document === "undefined") {
    return;
  }

  const [w1ImageUrl, w2ImageUrl] = await Promise.all([
    log.w1_image_url ? toDataUrl(log.w1_image_url) : Promise.resolve(null),
    log.w2_image_url ? toDataUrl(log.w2_image_url) : Promise.resolve(null),
  ]);

  const html2pdfModule = await import("html2pdf.js");
  const html2pdf = (html2pdfModule.default ?? html2pdfModule) as unknown as () => {
    set: (options: Record<string, unknown>) => { from: (element: HTMLElement) => { save: () => Promise<void> } };
  };

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.opacity = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";

  const page = document.createElement("div");
  page.style.width = "210mm";
  page.style.height = "297mm";
  page.style.background = "#ffffff";
  page.style.margin = "0";
  page.style.padding = "0";
  page.style.color = "#0f172a";
  page.style.fontFamily = "Segoe UI, Tahoma, Arial, sans-serif";

  const w1Time = log.w1_time ? formatDateTime(log.w1_time) : "-";
  const w2Time = log.w2_time ? formatDateTime(log.w2_time) : "-";
  const gateEntryTime = formatDateTime(log.created_at);

  page.innerHTML = `
    <div style="position:relative;width:210mm;height:148.5mm;padding:10mm 12mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;background:#ffffff;color:#000000;">
      <div style="text-align:center;">
        <div style="font-size:24px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;">Center Weightment Slip</div>
        <div style="font-size:17px;font-weight:600;color:#111827;margin-top:2mm;">${escapeHtml(displayValue(centerName))}</div>
        <div style="font-size:13px;font-weight:700;color:#1f2937;margin-top:1.5mm;">Entry ID: ${escapeHtml(displayValue(log.entry_id))}</div>
      </div>

      <div style="border-top:1px solid #111827;"></div>

      <div style="display:flex;gap:8mm;">
        <div style="flex:1;display:flex;align-items:flex-end;gap:2mm;">
          <span style="font-size:13px;font-weight:700;white-space:nowrap;">Farmer:</span>
          <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(log.farmer_name))}</span>
        </div>
        <div style="flex:1;display:flex;align-items:flex-end;gap:2mm;">
          <span style="font-size:13px;font-weight:700;white-space:nowrap;">Portal Id:</span>
          <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(log.portal_id ?? log.cnic))}</span>
        </div>
      </div>

      <div style="display:flex;gap:8mm;">
        <div style="flex:1;display:flex;align-items:flex-end;gap:2mm;">
          <span style="font-size:13px;font-weight:700;white-space:nowrap;">Driver Name:</span>
          <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(log.driver_name))}</span>
        </div>
        <div style="flex:1;display:flex;align-items:flex-end;gap:2mm;">
          <span style="font-size:13px;font-weight:700;white-space:nowrap;">Cell No:</span>
          <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(log.driver_phone ?? log.phone))}</span>
        </div>
      </div>

      <div style="border-top:1px solid #111827;"></div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:6mm;">
        <div style="flex:1;display:flex;flex-direction:column;gap:5mm;padding-right:4mm;">
          <div style="display:flex;align-items:flex-end;gap:2mm;">
            <span style="font-size:13px;font-weight:700;white-space:nowrap;">First Weight (W1):</span>
            <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(log.w1))}</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:2mm;">
            <span style="font-size:13px;font-weight:700;white-space:nowrap;">Completion Time:</span>
            <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(w1Time))}</span>
          </div>
        </div>
        ${renderPictureBox("Picture 1", w1ImageUrl)}
      </div>

      <div style="border-top:1px solid #111827;"></div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:6mm;">
        <div style="flex:1;display:flex;flex-direction:column;gap:5mm;padding-right:4mm;">
          <div style="display:flex;align-items:flex-end;gap:2mm;">
            <span style="font-size:13px;font-weight:700;white-space:nowrap;">Second Weight (W2):</span>
            <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(log.w2))}</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:2mm;">
            <span style="font-size:13px;font-weight:700;white-space:nowrap;">Completion Time:</span>
            <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(w2Time))}</span>
          </div>
        </div>
        ${renderPictureBox("Picture 2", w2ImageUrl)}
      </div>

      <div style="border-top:1px solid #111827;"></div>

      <div style="display:flex;flex-direction:column;gap:5mm;">
        <div style="display:flex;align-items:flex-end;gap:2mm;width:72%;">
          <span style="font-size:14px;font-weight:800;white-space:nowrap;">Net Weight:</span>
          <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:14px;font-weight:800;color:#111827;padding-bottom:1mm;">${escapeHtml(displayValue(log.w3))}</span>
        </div>

        <div style="display:flex;gap:8mm;">
          <div style="flex:1;display:flex;align-items:flex-end;gap:2mm;">
            <span style="font-size:13px;font-weight:700;white-space:nowrap;">Gate Person:</span>
            <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(gatePersonName))}</span>
          </div>
          <div style="flex:1;display:flex;align-items:flex-end;gap:2mm;">
            <span style="font-size:13px;font-weight:700;white-space:nowrap;">Weight Person:</span>
            <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(weightManagerName))}</span>
          </div>
        </div>

        <div style="display:flex;gap:8mm;">
          <div style="flex:1;display:flex;align-items:flex-end;gap:2mm;">
            <span style="font-size:13px;font-weight:700;white-space:nowrap;">Gate Entry Time:</span>
            <span style="flex:1;border-bottom:1px solid #6b7280;text-align:center;font-size:13px;color:#1f2937;padding-bottom:1mm;">${escapeHtml(displayValue(gateEntryTime))}</span>
          </div>
          <div style="flex:1;"></div>
        </div>
      </div>

      <div style="position:absolute;left:0;right:0;bottom:0;border-bottom:1px dashed #111827;"></div>
    </div>
  `;

  host.appendChild(page);
  document.body.appendChild(host);
  await waitForImages(page);

  const saveName = fileName ?? `wheat-log-${log.id}.pdf`;

  await html2pdf()
    .set({
      margin: 0,
      filename: saveName,
      image: { type: "jpeg", quality: 0.98 },
      pagebreak: { mode: ["css", "legacy"] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: page.scrollWidth,
        windowHeight: page.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(page)
    .save();

  host.remove();
}