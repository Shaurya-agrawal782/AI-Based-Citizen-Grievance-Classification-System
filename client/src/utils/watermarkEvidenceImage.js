/**
 * watermarkEvidenceImage.js
 * Adds a visible geo-metadata watermark to an evidence image using HTML Canvas.
 * Falls back gracefully to the original file if canvas is unavailable.
 */

/**
 * Format a Date object (or ISO string) as DD/MM/YYYY HH:mm
 */
function formatWatermarkDate(dateInput) {
  try {
    const d = new Date(dateInput);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return 'Unknown time';
  }
}

function compactWatermarkText(value, maxLength = 72) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Draw a semi-transparent watermark panel on the bottom-left of the image.
 *
 * @param {File} file      - Original image File object
 * @param {object} geoTag  - { lat, lng, accuracy, capturedAt, source }
 * @param {string} landmark - Optional landmark string
 * @returns {Promise<File>} - New File with watermark baked in, or original file on error
 */
export async function watermarkImage(file, geoTag, landmark = '') {
  if (typeof document === 'undefined' || !file) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return resolve(file);
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // --- Watermark layout ---
        const scale = Math.max(1, canvas.width / 1200); // scale text for high-res images
        const fontSize = Math.round(14 * scale);
        const lineHeight = Math.round(20 * scale);
        const padding = Math.round(12 * scale);
        const cornerRadius = Math.round(6 * scale);

        const lat = geoTag?.lat != null ? Number(geoTag.lat).toFixed(6) : 'N/A';
        const lng = geoTag?.lng != null ? Number(geoTag.lng).toFixed(6) : 'N/A';
        const accuracy = geoTag?.accuracy != null ? `${Math.round(geoTag.accuracy)} m` : 'N/A';
        const time = formatWatermarkDate(geoTag?.capturedAt || new Date());
        const address = compactWatermarkText(geoTag?.address || '');

        const lines = [
          '📍 CivicTrust Evidence',
          `Lat: ${lat}   Lng: ${lng}`,
          `Accuracy: ${accuracy}`,
          `Time: ${time}`,
          ...(address ? [`Address: ${address}`] : []),
          ...(landmark ? [`Place: ${landmark}`] : []),
        ];

        ctx.font = `bold ${fontSize}px 'Arial', sans-serif`;
        const maxWidth = lines.reduce((max, l) => Math.max(max, ctx.measureText(l).width), 0);
        const boxW = maxWidth + padding * 2;
        const boxH = lines.length * lineHeight + padding * 2;
        const boxX = padding;
        const boxY = canvas.height - boxH - padding;

        // Semi-transparent background
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(boxX + cornerRadius, boxY);
        ctx.lineTo(boxX + boxW - cornerRadius, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + cornerRadius);
        ctx.lineTo(boxX + boxW, boxY + boxH - cornerRadius);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - cornerRadius, boxY + boxH);
        ctx.lineTo(boxX + cornerRadius, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - cornerRadius);
        ctx.lineTo(boxX, boxY + cornerRadius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + cornerRadius, boxY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Text
        ctx.globalAlpha = 1;
        lines.forEach((line, i) => {
          const y = boxY + padding + fontSize + i * lineHeight;
          // White shadow for readability
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillText(line, boxX + padding + 1, y + 1);
          ctx.fillStyle = i === 0 ? '#4ade80' : '#f1f5f9';
          ctx.fillText(line, boxX + padding, y);
        });

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) return resolve(file);
            const watermarkedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(watermarkedFile);
          },
          'image/jpeg',
          0.88
        );
      } catch (err) {
        console.warn('[watermarkImage] Canvas error, returning original:', err);
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // graceful fallback
    };

    img.src = objectUrl;
  });
}
