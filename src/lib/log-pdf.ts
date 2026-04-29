import { WheatLog } from "@/types/app";

type ReceiptPdfItem = {
  log: WheatLog;
  millName?: string | null;
  centerName?: string | null;
  gatePersonName?: string | null;
  weightManagerName?: string | null;
  w1ImageUrl?: string | null;
  w2ImageUrl?: string | null;
};

type LogPdfOptions = ReceiptPdfItem & {
  fileName?: string;
};

type BulkLogPdfOptions = {
  items: ReceiptPdfItem[];
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

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB").format(date);
}

function formatTimeOnly(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function renderLineValue(value: string | number | null | undefined) {
  return `<span style="display:block;width:100%;white-space:normal;word-break:break-word;line-height:1.2;letter-spacing:0;">${escapeHtml(displayValue(value))}</span>`;
}

function formatMetricTon(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const tons = value / 1000;
  return tons.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function renderPictureBox(label: string, url: string | null) {
  if (!url) {
    return `<div style="width:27mm;height:27mm;border:1px solid #111827;display:flex;align-items:center;justify-content:center;font-size:9px;color:#374151;">${escapeHtml(label)}</div>`;
  }

  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" crossorigin="anonymous" style="width:27mm;height:27mm;border:1px solid #111827;object-fit:cover;" />`;
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

function renderReceiptSection(item: ReceiptPdfItem, showDividerTop = false) {
  const { log, millName, centerName, gatePersonName, weightManagerName, w1ImageUrl, w2ImageUrl } = item;
  const w1Date = formatDateOnly(log.w1_time);
  const w1Time = formatTimeOnly(log.w1_time);
  const w2Date = formatDateOnly(log.w2_time);
  const w2Time = formatTimeOnly(log.w2_time);
  const gateEntryDate = formatDateOnly(log.created_at);
  const gateEntryTime = formatTimeOnly(log.created_at);
  const netMetricTon = formatMetricTon(log.w3);
  const remarksText = log.remarks && String(log.remarks).trim() ? String(log.remarks).trim() : "";

  return `
    <section style="box-sizing:border-box;display:flex;flex-direction:column;gap:2mm;padding:5.5mm 8mm 5.2mm 8mm;background:#ffffff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-weight:400;${showDividerTop ? "border-top:1px solid #111827;" : ""}">
      <div style="text-align:center;line-height:1.15;">
        <div style="font-size:15px;font-weight:700;letter-spacing:0.01em;text-transform:uppercase;">Center Weightment Slip</div>
        <div style="font-size:12px;font-weight:700;margin-top:0.8mm;">${escapeHtml(displayValue(millName))}</div>
        <div style="font-size:11px;font-weight:600;margin-top:0.55mm;">${escapeHtml(displayValue(centerName))}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.6mm 7mm;font-size:10px;line-height:1.2;">
        <div style="display:grid;grid-template-columns:86px 9px 1fr;gap-y:1.05mm;align-items:start;">
          <div>Entry Id</div><div>:</div><div>${renderLineValue(log.entry_id)}</div>
          <div>Farmer Name</div><div>:</div><div>${renderLineValue(log.farmer_name)}</div>
          <div>Farmer CNIC</div><div>:</div><div>${renderLineValue(log.farmer_cnic ?? log.cnic)}</div>
          <div>Driver Name</div><div>:</div><div>${renderLineValue(log.driver_name)}</div>
        </div>
        <div style="display:grid;grid-template-columns:86px 9px 1fr;gap-y:1.05mm;align-items:start;">
          <div>Vehicle Number</div><div>:</div><div>${renderLineValue(log.vehicle_phone ?? log.car_plate)}</div>
          <div>Cell No</div><div>:</div><div>${renderLineValue(log.driver_phone ?? log.phone)}</div>
          <div>Godown Number</div><div>:</div><div>${renderLineValue(log.second_godown)}</div>
          <div>Gate Entry Time</div><div>:</div><div>${renderLineValue(`${gateEntryDate} ${gateEntryTime}`)}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;border:1px solid #111827;table-layout:fixed;">
        <thead>
          <tr>
            <th style="border-right:1px solid #111827;padding:2px 3px;font-size:10px;text-align:center;width:22%;">Weight</th>
            <th style="border-right:1px solid #111827;padding:2px 3px;font-size:10px;text-align:center;width:22%;">Date</th>
            <th style="border-right:1px solid #111827;padding:2px 3px;font-size:10px;text-align:center;width:20%;">Time</th>
            <th style="border-right:1px solid #111827;padding:2px 3px;font-size:10px;text-align:center;width:18%;">Weight</th>
            <th style="padding:2px 3px;font-size:10px;text-align:center;width:18%;">Pictures</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-top:1px solid #111827;">
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;">First</td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;text-align:center;">${escapeHtml(w1Date)}</td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;text-align:center;">${escapeHtml(w1Time)}</td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:11px;text-align:right;font-weight:700;">${escapeHtml(displayValue(log.w1))} KG</td>
            <td style="padding:2px 5px;font-size:10px;text-align:center;">${renderPictureBox("pic weight 1", w1ImageUrl ?? null)}</td>
          </tr>
          <tr style="border-top:1px solid #111827;">
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;">Second</td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;text-align:center;">${escapeHtml(w2Date)}</td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;text-align:center;">${escapeHtml(w2Time)}</td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:11px;text-align:right;font-weight:700;">${escapeHtml(displayValue(log.w2))} KG</td>
            <td style="padding:2px 5px;font-size:10px;text-align:center;">${renderPictureBox("pic weight 2", w2ImageUrl ?? null)}</td>
          </tr>
          <tr style="border-top:1px solid #111827;">
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;">Net</td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;text-align:center;"></td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:10px;text-align:center;"></td>
            <td style="border-right:1px solid #111827;padding:2px 5px;font-size:11px;text-align:right;font-weight:700;">${escapeHtml(displayValue(log.w3))} KG</td>
            <td style="padding:2px 5px;font-size:10px;text-align:right;color:#7f1d1d;">${netMetricTon === "-" ? "-" : `${escapeHtml(netMetricTon)} M.T`}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;align-items:center;gap:2mm;font-size:10px;line-height:1.2;">
        <span style="font-weight:700;white-space:nowrap;color:#7f1d1d;">Remarks</span>
        <div style="flex:1;min-height:6.2mm;border:1px solid #111827;padding:1.2mm 1.8mm;word-break:break-word;">${escapeHtml(remarksText)}</div>
      </div>

      <div style="display:flex;gap:8mm;font-size:10px;line-height:1.2;margin-top:1.6mm;">
        <div style="flex:1;display:flex;align-items:center;gap:2mm;">
          <span style="font-weight:700;white-space:nowrap;">Gate Person:</span>
          <span style="flex:1;min-width:0;text-align:center;word-break:break-word;">${escapeHtml(displayValue(gatePersonName))}</span>
        </div>
        <div style="flex:1;display:flex;align-items:center;gap:2mm;">
          <span style="font-weight:700;white-space:nowrap;">Weight Person:</span>
          <span style="flex:1;min-width:0;text-align:center;word-break:break-word;">${escapeHtml(displayValue(weightManagerName))}</span>
        </div>
      </div>

    </section>
  `;
}

function renderPdfPages(items: ReceiptPdfItem[]) {
  const pages: string[] = [];

  for (let index = 0; index < items.length; index += 2) {
    const first = items[index];
    const second = items[index + 1];
    const hasNextPage = index + 2 < items.length;

    pages.push(`
      <div style="width:210mm;box-sizing:border-box;background:#ffffff;padding:5mm;page-break-after:${hasNextPage ? "always" : "auto"};">
        ${renderReceiptSection(first, false)}
        ${second ? renderReceiptSection(second, true) : ""}
      </div>
    `);
  }

  return pages.join("");
}

async function downloadPdfFromItems(items: ReceiptPdfItem[], fileName?: string) {
  if (typeof document === "undefined" || !items.length) {
    return;
  }

  const preparedItems = await Promise.all(
    items.map(async (item) => ({
      ...item,
      w1ImageUrl: item.log.w1_image_url ? await toDataUrl(item.log.w1_image_url) : null,
      w2ImageUrl: item.log.w2_image_url ? await toDataUrl(item.log.w2_image_url) : null,
    })),
  );

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

  const pageRoot = document.createElement("div");
  pageRoot.style.width = "210mm";
  pageRoot.style.margin = "0";
  pageRoot.style.padding = "0";
  pageRoot.style.background = "#ffffff";
  pageRoot.innerHTML = renderPdfPages(preparedItems);

  host.appendChild(pageRoot);
  document.body.appendChild(host);
  await waitForImages(pageRoot);

  await html2pdf()
    .set({
      margin: 0,
      filename: fileName ?? `wheat-logs-${Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      pagebreak: { mode: ["css", "legacy"] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: pageRoot.scrollWidth,
        windowHeight: pageRoot.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(pageRoot)
    .save();

  host.remove();
}

export async function downloadWheatLogPdf(options: LogPdfOptions) {
  await downloadPdfFromItems(
    [
      {
        log: options.log,
        millName: options.millName,
        centerName: options.centerName,
        gatePersonName: options.gatePersonName,
        weightManagerName: options.weightManagerName,
      },
    ],
    options.fileName,
  );
}

export async function downloadWheatLogsPdf({ items, fileName }: BulkLogPdfOptions) {
  await downloadPdfFromItems(items, fileName);
}