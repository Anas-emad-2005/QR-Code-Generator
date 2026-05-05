const urlInput = document.getElementById("urlInput");
const urlError = document.getElementById("urlError");
const qrForm = document.getElementById("qrForm");
const qrPreview = document.getElementById("qrPreview");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const copyBtn = document.getElementById("copyBtn");
const customColor = document.getElementById("customColor");
const backgroundColor = document.getElementById("backgroundColor");
const qrSize = document.getElementById("qrSize");
const downloadFormat = document.getElementById("downloadFormat");
const toastContainer = document.getElementById("toastContainer");
const contrastWarning = document.getElementById("contrastWarning");
const presetColors = document.getElementById("presetColors");
const linkPreview = document.getElementById("linkPreview");

let qrCode = null;
let generatedUrl = "";
let currentQrColor = "#111827";

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2800);
}

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16)
  };
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const values = [r, g, b].map(value => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function getContrastRatio(colorOne, colorTwo) {
  const lumOne = getLuminance(colorOne);
  const lumTwo = getLuminance(colorTwo);
  const brightest = Math.max(lumOne, lumTwo);
  const darkest = Math.min(lumOne, lumTwo);

  return (brightest + 0.05) / (darkest + 0.05);
}

function updateContrastWarning() {
  const ratio = getContrastRatio(currentQrColor, backgroundColor.value);
  contrastWarning.classList.toggle("show", ratio < 4.5);
}

function clearPreviewMessage() {
  qrPreview.innerHTML = "";
}

function createQrCode() {
  const link = urlInput.value.trim();
  const size = Number(qrSize.value);

  urlError.textContent = "";

  if (!link) {
    urlError.textContent = "الرجاء إدخال رابط.";
    showToast("الرجاء إدخال رابط صحيح", "error");
    return;
  }

  if (!isValidUrl(link)) {
    urlError.textContent = "الرابط غير صحيح. يجب أن يبدأ بـ http أو https.";
    showToast("الرجاء إدخال رابط صحيح", "error");
    return;
  }

  try {
    clearPreviewMessage();

    qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: "canvas",
      data: link,
      image: "",
      dotsOptions: {
        color: currentQrColor,
        type: "rounded"
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: currentQrColor
      },
      cornersDotOptions: {
        type: "dot",
        color: currentQrColor
      },
      backgroundOptions: {
        color: backgroundColor.value
      },
      qrOptions: {
        errorCorrectionLevel: "H"
      }
    });

    qrCode.append(qrPreview);
    generatedUrl = link;
    downloadBtn.hidden = false;
    linkPreview.textContent = link;
    linkPreview.classList.add("show");
    showToast("تم إنشاء QR بنجاح", "success");
  } catch (error) {
    showToast("حدث خطأ أثناء إنشاء QR", "error");
  }
}

async function getQrBlob(format = "png") {
  if (!qrCode) {
    throw new Error("QR غير موجود");
  }

  return await qrCode.getRawData(format);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function downloadPng() {
  const blob = await getQrBlob("png");
  downloadBlob(blob, "qr-code.png");
}

async function downloadSvg() {
  const blob = await getQrBlob("svg");
  downloadBlob(blob, "qr-code.svg");
}

async function downloadJpg() {
  const pngBlob = await getQrBlob("png");
  const imageUrl = URL.createObjectURL(pngBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext("2d");
    context.fillStyle = backgroundColor.value;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    canvas.toBlob(blob => {
      downloadBlob(blob, "qr-code.jpg");
      URL.revokeObjectURL(imageUrl);
    }, "image/jpeg", 0.95);
  };

  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    showToast("فشل تحميل JPG", "error");
  };

  image.src = imageUrl;
}

async function downloadPdf() {
  const pngBlob = await getQrBlob("png");
  const reader = new FileReader();

  reader.onload = () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    pdf.setFontSize(18);
    pdf.text("QR Code Generator", 105, 25, { align: "center" });
    pdf.addImage(reader.result, "PNG", 55, 42, 100, 100);
    pdf.setFontSize(11);
    pdf.text(generatedUrl, 105, 155, { align: "center", maxWidth: 170 });
    pdf.save("qr-code.pdf");
  };

  reader.readAsDataURL(pngBlob);
}

async function downloadDocx() {
  const pngBlob = await getQrBlob("png");
  const arrayBuffer = await pngBlob.arrayBuffer();

  const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } = docx;

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "QR Code Generator",
                bold: true,
                size: 34
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 300 },
            children: [
              new TextRun({
                text: generatedUrl,
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: arrayBuffer,
                transformation: {
                  width: 260,
                  height: 260
                }
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, "qr-code.docx");
}

async function handleDownload() {
  if (!qrCode) {
    showToast("أنشئ QR أولاً", "error");
    return;
  }

  try {
    const format = downloadFormat.value;

    if (format === "png") await downloadPng();
    if (format === "jpg") await downloadJpg();
    if (format === "svg") await downloadSvg();
    if (format === "pdf") await downloadPdf();
    if (format === "docx") await downloadDocx();

    showToast("تم تحميل الملف بنجاح", "success");
  } catch (error) {
    showToast("حدث خطأ أثناء التحميل", "error");
  }
}

function resetForm() {
  urlInput.value = "";
  urlError.textContent = "";
  customColor.value = "#111827";
  backgroundColor.value = "#ffffff";
  qrSize.value = "300";
  downloadFormat.value = "png";
  currentQrColor = "#111827";
  qrCode = null;
  generatedUrl = "";

  document.querySelectorAll(".color-dot").forEach(button => {
    button.classList.toggle("active", button.dataset.color === "#111827");
  });

  qrPreview.innerHTML = "<span>لم يتم إنشاء QR بعد</span>";
  downloadBtn.hidden = true;
  contrastWarning.classList.remove("show");
  linkPreview.classList.remove("show");
  linkPreview.textContent = "";
  showToast("تمت إعادة الإعدادات", "success");
}

async function copyInputLink() {
  const link = urlInput.value.trim();

  if (!link || !isValidUrl(link)) {
    showToast("لا يوجد رابط صحيح للنسخ", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
    showToast("تم نسخ الرابط", "success");
  } catch {
    showToast("فشل نسخ الرابط", "error");
  }
}

presetColors.addEventListener("click", event => {
  const button = event.target.closest(".color-dot");
  if (!button) return;

  document.querySelectorAll(".color-dot").forEach(item => item.classList.remove("active"));
  button.classList.add("active");

  currentQrColor = button.dataset.color;
  customColor.value = currentQrColor;
  updateContrastWarning();
});

customColor.addEventListener("input", () => {
  currentQrColor = customColor.value;
  document.querySelectorAll(".color-dot").forEach(item => item.classList.remove("active"));
  updateContrastWarning();
});

backgroundColor.addEventListener("input", updateContrastWarning);

qrForm.addEventListener("submit", event => {
  event.preventDefault();
  updateContrastWarning();
  createQrCode();
});

downloadBtn.addEventListener("click", handleDownload);
resetBtn.addEventListener("click", resetForm);
copyBtn.addEventListener("click", copyInputLink);

updateContrastWarning();
