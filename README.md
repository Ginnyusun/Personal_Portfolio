# Justine Soulié 风格横向作品墙

这个项目复刻了参考网站的首页交互：画布固定在视口内，作品沿同一条水平带连续移动；所有海报共用同一条上边缘和下边缘基线，顶点网格按照屏幕横坐标形成抛物线形变，让中心作品自然凸起。

## 运行

```bash
npm install
npm run dev
```

也可以先运行 `npm run build`，再用 `npm run preview` 查看生产构建。

## 替换图片

占位图片在 `public/images/`，对应关系如下：

| 文件 | 当前项目 | 需要替换的内容 |
| --- | --- | --- |
| `01.svg` | hermes | Hermes promotional film |
| `02.svg` | extra | Illustrations |
| `03.svg` | typography | Typography |
| `04.svg` | miscellaneous | Miscellaneous |
| `05.svg` | M - Lettre Infinie | M - Lettre Infinie |
| `06.svg` | Ponpon Mania | Ponpon Mania |
| `07.svg` | Pop Art Car | Pop Art Car |
| `08.svg` | House of Frog | House of Frog |

直接用同名的 JPG、PNG 或 SVG 覆盖文件即可。如果修改了扩展名，请同步修改 `src/main.js` 顶部 `projects` 数组里的 `image` 路径。建议图片比例保持接近 `900:1200`，这样替换后上下基线和原站效果最稳定。

## 交互细节

- 鼠标滚轮、触摸拖拽和按住拖动都支持横向浏览。
- 作品位置使用连续浮点数，并在滚动停止后平滑吸附到最近一张。
- `ArrowLeft` / `ArrowRight` 可以切换作品。
- `prefers-reduced-motion` 开启时会降低惯性动画。

## 目录

- `src/main.js`：Three.js 画布、屏幕空间凸起、滚动和拖拽逻辑。
- `src/style.css`：原站风格的极简页头和作品信息。
- `public/images/`：可替换的作品图片。
