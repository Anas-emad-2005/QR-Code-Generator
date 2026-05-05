const urlInput = document.getElementById("urlInput");
const urlError = document.getElementById("urlError");
const urlHelper = document.getElementById("urlHelper");
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
const qrType = document.getElementById("qrType");
const urlFields = document.getElementById("urlFields");
const profileFields = document.getElementById("profileFields");
const openProfileBtn = document.getElementById("openProfileBtn");

let qrCode = null;
let generatedUrl = "";
let currentQrColor = "#111827";

const secretKey = "qr-profile-front-end-key";

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

  setTimeout(() => toast.remove(), 2800);
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

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeProfileData(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  const keyBytes = new TextEncoder().encode(secretKey);
  const output = bytes.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]);
  return base64UrlEncode(output);
}

function getInputValue(id) {
  return document.getElementById(id).value.trim();
}

function validateOptionalUrl(value, label) {
  if (!value) return "";
  if (!isValidUrl(value)) return `${label} يجب أن يكون رابطاً صحيحاً يبدأ بـ http أو https`;
  return "";
}

function collectProfileData() {
  return {
    name: getInputValue("profileName"),
    title: getInputValue("profileTitle"),
    phone: getInputValue("profilePhone"),
    whatsapp: getInputValue("profileWhatsapp"),
    bio: getInputValue("profileBio"),
    links: {
      facebook: getInputValue("facebookLink"),
      instagram: getInputValue("instagramLink"),
      telegram: getInputValue("telegramLink"),
      youtube: getInputValue("youtubeLink"),
      snapchat: getInputValue("snapchatLink"),
      tiktok: getInputValue("tiktokLink"),
      linkedin: getInputValue("linkedinLink"),
      website: getInputValue("websiteLink")
    }
  };
}

function validateProfileData(data) {
  if (!data.name) return "الرجاء إدخال الاسم.";
  if (!data.phone && !data.whatsapp && !Object.values(data.links).some(Boolean)) {
    return "أدخل رقم هاتف أو رابط واحد على الأقل.";
  }

  const checks = [
    [data.links.facebook, "Facebook"],
    [data.links.instagram, "Instagram"],
    [data.links.telegram, "Telegram"],
    [data.links.youtube, "YouTube"],
    [data.links.snapchat, "Snapchat"],
    [data.links.tiktok, "TikTok"],
    [data.links.linkedin, "LinkedIn"],
    [data.links.website, "Website"]
  ];

  for (const [value, label] of checks) {
    const error = validateOptionalUrl(value, label);
    if (error) return error;
  }

  return "";
}

function buildProfileUrl() {
  const data = collectProfileData();
  const error = validateProfileData(data);

  if (error) {
    urlError.textContent = error;
    showToast(error, "error");
    return "";
  }

  const encoded = encodeProfileData(data);
  const basePath = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
  return `${basePath}profile.html#p=${encoded}`;
}

function buildQrData() {
  urlError.textContent = "";

  if (qrType.value === "url") {
    const link = urlInput.value.trim();

    if (!link) {
      urlError.textContent = "الرجاء إدخال رابط.";
      showToast("الرجاء إدخال رابط صحيح", "error");
      return "";
    }

    if (!isValidUrl(link)) {
      urlError.textContent = "الرابط غير صحيح. يجب أن يبدأ بـ http أو https.";
      showToast("الرجاء إدخال رابط صحيح", "error");
      return "";
    }

    return link;
  }

  return buildProfileUrl();
}

function createQrCode() {
  const qrData = buildQrData();
  const size = Number(qrSize.value);

  if (!qrData) return;

  try {
    qrPreview.innerHTML = "";

    qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: "canvas",
      data: qrData,
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
    generatedUrl = qrData;
    downloadBtn.hidden = false;
    openProfileBtn.hidden = qrType.value !== "profile";
    linkPreview.textContent = qrType.value === "profile" ? "تم إنشاء رابط بطاقة مخفي البيانات داخل QR" : qrData;
    linkPreview.classList.add("show");
    updateQrTypeUi();
    showToast("تم إنشاء QR بنجاح", "success");
  } catch {
    showToast("حدث خطأ أثناء إنشاء QR", "error");
  }
}

async function getQrBlob(format = "png") {
  if (!qrCode) throw new Error("QR غير موجود");
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
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.setFontSize(18);
    pdf.text("QR Code Generator", 105, 25, { align: "center" });
    pdf.addImage(reader.result, "PNG", 55, 42, 100, 100);
    pdf.setFontSize(11);
    const text = qrType.value === "profile" ? "Digital Profile QR" : generatedUrl;
    pdf.text(text, 105, 155, { align: "center", maxWidth: 170 });
    pdf.save("qr-code.pdf");
  };

  reader.readAsDataURL(pngBlob);
}

async function downloadDocx() {
  const pngBlob = await getQrBlob("png");
  const arrayBuffer = await pngBlob.arrayBuffer();
  const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } = docx;

  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "QR Code Generator", bold: true, size: 34 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 300 }, children: [new TextRun({ text: qrType.value === "profile" ? "Digital Profile QR" : generatedUrl, size: 22 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: arrayBuffer, transformation: { width: 260, height: 260 } })] })
      ]
    }]
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
  } catch {
    showToast("حدث خطأ أثناء التحميل", "error");
  }
}

function resetForm() {
  qrForm.reset();
  urlError.textContent = "";
  customColor.value = "#111827";
  backgroundColor.value = "#ffffff";
  qrSize.value = "300";
  downloadFormat.value = "png";
  qrType.value = "url";
  currentQrColor = "#111827";
  qrCode = null;
  generatedUrl = "";

  document.querySelectorAll(".color-dot").forEach(button => {
    button.classList.toggle("active", button.dataset.color === "#111827");
  });

  updateQrTypeUi();
  qrPreview.innerHTML = "<span>لم يتم إنشاء QR بعد</span>";
  downloadBtn.hidden = true;
  openProfileBtn.hidden = true;
  contrastWarning.classList.remove("show");
  linkPreview.classList.remove("show");
  linkPreview.textContent = "";
  showToast("تمت إعادة الإعدادات", "success");
}

async function copyInputLink() {
  const link = qrType.value === "profile" ? generatedUrl : urlInput.value.trim();

  if (!link || (qrType.value === "url" && !isValidUrl(link))) {
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
  updateQrTypeUi();
updateContrastWarning();
});

customColor.addEventListener("input", () => {
  currentQrColor = customColor.value;
  document.querySelectorAll(".color-dot").forEach(item => item.classList.remove("active"));
  updateQrTypeUi();
updateContrastWarning();
});

backgroundColor.addEventListener("input", updateContrastWarning);

function updateQrTypeUi() {
  const isProfile = qrType.value === "profile";

  profileFields.classList.toggle("hidden", !isProfile);
  urlFields.classList.remove("hidden");

  urlInput.disabled = isProfile;
  urlInput.required = !isProfile;
  copyBtn.disabled = isProfile && !generatedUrl;

  if (isProfile) {
    urlInput.value = "";
    urlInput.placeholder = "سيتم إنشاء رابط البطاقة تلقائياً";
    urlHelper.textContent = "حقل الرابط العادي مغلق وغير إجباري عند اختيار بطاقة شخصية رقمية.";
    copyBtn.textContent = generatedUrl ? "نسخ رابط البطاقة" : "نسخ";
    urlError.textContent = "";
  } else {
    urlInput.placeholder = "https://example.com";
    urlHelper.textContent = "هذا الحقل مطلوب فقط عند اختيار رابط عادي.";
    copyBtn.textContent = "نسخ";
  }
}

qrType.addEventListener("change", () => {
  urlError.textContent = "";
  openProfileBtn.hidden = true;
  downloadBtn.hidden = true;
  qrCode = null;
  generatedUrl = "";
  qrPreview.innerHTML = "<span>لم يتم إنشاء QR بعد</span>";
  linkPreview.classList.remove("show");
  linkPreview.textContent = "";
  updateQrTypeUi();
});

qrForm.addEventListener("submit", event => {
  event.preventDefault();
  updateQrTypeUi();
updateContrastWarning();
  createQrCode();
});

downloadBtn.addEventListener("click", handleDownload);
resetBtn.addEventListener("click", resetForm);
copyBtn.addEventListener("click", copyInputLink);
openProfileBtn.addEventListener("click", () => {
  if (generatedUrl) window.open(generatedUrl, "_blank");
});

updateQrTypeUi();
updateContrastWarning();
