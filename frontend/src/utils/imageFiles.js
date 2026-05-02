export function resizeImageFileToDataUrl(file, { maxSize = 640, quality = 0.86 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    reader.onload = () => {
      const originalDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!originalDataUrl) {
        resolve('');
        return;
      }

      const image = new Image();
      image.onerror = () => resolve(originalDataUrl);
      image.onload = () => {
        const longestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
        if (!longestSide) {
          resolve(originalDataUrl);
          return;
        }

        const scale = Math.min(1, maxSize / longestSide);
        const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(originalDataUrl);
          return;
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.src = originalDataUrl;
    };

    reader.readAsDataURL(file);
  });
}
