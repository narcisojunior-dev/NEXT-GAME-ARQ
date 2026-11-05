export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGL2RenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}


/** Nome do renderer do WebGL (ex.: "Intel(R) UHD Graphics 620") para escolher o nível de qualidade (#63) */
export function getWebGLRenderer(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return null;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return typeof renderer === 'string' ? renderer : null;
  } catch {
    return null;
  }
}
