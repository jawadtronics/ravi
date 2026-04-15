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

function renderImageCard(label: string, url: string | null) {
  if (!url) {
    return `<div style="border:1px solid #d1d5db;border-radius:14px;padding:14px;background:#f8fafc;color:#64748b;">${escapeHtml(label)} not uploaded</div>`;
  }

  return `
    <div style="border:1px solid #d1d5db;border-radius:14px;padding:10px;background:#fff;">
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;">${escapeHtml(label)}</div>
      <img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" crossorigin="anonymous" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;" />
    </div>
  `;
}

export async function downloadWheatLogPdf({ log, centerName, gatePersonName, weightManagerName, fileName }: LogPdfOptions) {
  if (typeof document === "undefined") {
    return;
  }

  const [carImageUrl, w1ImageUrl, w2ImageUrl] = await Promise.all([
    log.car_image_url ? toDataUrl(log.car_image_url) : Promise.resolve(null),
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
  page.style.width = "794px";
  page.style.background = "#ffffff";
  page.style.padding = "24px";
  page.style.color = "#0f172a";
  page.style.fontFamily = "Arial, sans-serif";
  page.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:18px;border-bottom:2px solid #e2e8f0;padding-bottom:16px;break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:58px;height:58px;border-radius:18px;background:linear-gradient(135deg,#b45309,#f59e0b);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;">NM</div>
        <div>
          <div style="font-size:22px;font-weight:900;letter-spacing:0.02em;">N&amp;M Flour Mills</div>
          <div style="font-size:13px;color:#475569;">Wheat Vehicle Record</div>
        </div>
      </div>
      <div style="text-align:right;font-size:12px;color:#475569;">
        <div><strong>Status:</strong> ${escapeHtml(log.status)}</div>
        <div><strong>Generated:</strong> ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
      ${renderImageCard("Car Image", carImageUrl)}
      ${renderImageCard("W1 Image", w1ImageUrl)}
      ${renderImageCard("W2 Image", w2ImageUrl)}
      <div style="border:1px solid #d1d5db;border-radius:14px;padding:14px;background:#f8fafc;">
        <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:10px;">Key Details</div>
        <div style="display:grid;gap:8px;font-size:13px;color:#334155;">
          <div><strong>Driver Name:</strong> ${escapeHtml(log.driver_name)}</div>
          <div><strong>CNIC:</strong> ${escapeHtml(log.cnic)}</div>
          <div><strong>Phone:</strong> ${escapeHtml(log.phone ?? "-")}</div>
          <div><strong>Address:</strong> ${escapeHtml(log.address ?? "-")}</div>
          <div><strong>Car Plate:</strong> ${escapeHtml(log.car_plate)}</div>
          <div><strong>Center:</strong> ${escapeHtml(centerName ?? "-")}</div>
          <div><strong>Gate Person:</strong> ${escapeHtml(gatePersonName ?? "-")}</div>
          <div><strong>Weight Manager:</strong> ${escapeHtml(weightManagerName ?? "-")}</div>
        </div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tbody>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;background:#f8fafc;font-weight:700;">Gate Entry Time</td><td style="border:1px solid #cbd5e1;padding:10px;">${escapeHtml(formatDateTime(log.created_at))}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;background:#f8fafc;font-weight:700;">Weight Completion Time</td><td style="border:1px solid #cbd5e1;padding:10px;">${escapeHtml(log.status === "completed" ? formatDateTime(log.updated_at) : "-")}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;background:#f8fafc;font-weight:700;">Expected Bags</td><td style="border:1px solid #cbd5e1;padding:10px;">${escapeHtml(String(log.expected_bags))}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;background:#f8fafc;font-weight:700;">W1</td><td style="border:1px solid #cbd5e1;padding:10px;">${escapeHtml(log.w1 === null || log.w1 === undefined ? "-" : String(log.w1))}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;background:#f8fafc;font-weight:700;">W2</td><td style="border:1px solid #cbd5e1;padding:10px;">${escapeHtml(log.w2 === null || log.w2 === undefined ? "-" : String(log.w2))}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;background:#f8fafc;font-weight:700;">W3</td><td style="border:1px solid #cbd5e1;padding:10px;">${escapeHtml(log.w3 === null || log.w3 === undefined ? "-" : String(log.w3))}</td></tr>
      </tbody>
    </table>
  `;

  host.appendChild(page);
  document.body.appendChild(host);
  await waitForImages(page);

  const saveName = fileName ?? `wheat-log-${log.id}.pdf`;

  await html2pdf()
    .set({
      margin: 6,
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