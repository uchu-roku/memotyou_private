import { defineConfig } from 'vite';
// GitHub Pages のプロジェクトページ公開に合わせた base 設定
// 公開先が https://<user>.github.io/memotyou_public/ の場合
export default defineConfig({
  base: '/memotyou_public/',
});
