# Открытые технические источники

Изучены 12 сентября 2026 года. Проект использует локальный Three.js r160; применимость API дополнительно проверена по исходному коду этой версии.

- [NVIDIA GPU Gems, Shadow Map Antialiasing](https://developer.nvidia.com/gpugems/gpugems/part-ii-lighting-and-shadows/chapter-11-shadow-map-antialiasing): фильтрация PCF усредняет результаты сравнений глубины. В игре применены четыре билинейные выборки, суммарно 16 сравнений, для сглаживания границ объёмных теней маяка.
- [Three.js LightShadow](https://threejs.org/docs/pages/LightShadow.html): увеличение разрешения карты повышает детализацию; чрезмерный normalBias способен искажать тени. В игре — карта 2048² и normalBias 0.025 вместо 0.07.
- [Three.js r160 WebGLShadowMap](https://github.com/mrdoob/three.js/blob/r160/src/renderers/webgl/WebGLShadowMap.js): проверено наследование map, alphaMap, alphaTest и shadowSide при отрисовке теней. Для листвы сохранены вырезанные по альфа-каналу силуэты, без сплошных прямоугольных теней.
- [Three.js SpotLight](https://threejs.org/docs/pages/SpotLight.html): angle, penumbra, distance и target используются для направленных вниз уличных источников. Объёмный конус получает те же угловые границы.

Плавная интеграция высотного тумана, пересечение луча с конечным конусом и свечение дальнего огня реализованы в проекте. Это не внедрение тяжёлой системы временного накопления из другого движка.

## v0.6.18 — мигалки и производительность

- [Three.js PointLight](https://threejs.org/docs/pages/PointLight.html): точечное излучение во всех направлениях, затухание с расстоянием. Применено для двух источников в геометрических центрах плафонов, decay=2. Это игровая аппроксимация, не фотометрическая модель конкретного прибора.
- [Whelen Legacy](https://www.whelen.com/lightbars/full-size-roof-mounted/legacy): принцип покрытия 360° у предупреждающих световых панелей. Использован как ориентир характера свечения; модель автомобиля не выдаётся за эту модель панели.
- [NVIDIA: Fast, Flexible, Physically-Based Volumetric Light Scattering](https://developer.download.nvidia.com/gameworks/events/GDC2016/Fast%20Flexible%20Physically-Based%20Volumetric%20Light%20Scattering%20-%20Notes.pdf): расчёт рассеивания в уменьшенном буфере и двустороннее масштабирование с учётом глубины. Применён отдельный буфер света и пространственное восстановление по четырём соседним отсчётам без истории кадров.
- [NVIDIA GPU Gems 3, chapter 15](https://developer.nvidia.com/gpugems/gpugems3/part-ii-lighting-and-shadows/chapter-15-managing-visibility-pixel-lighting): исключение невидимого вклада при попиксельном освещении. В локальном Three.js обнаружено безусловное выполнение BRDF даже для нулевого света; добавлена проверка directLight.visible, без изменения светового вклада.
- [Three.js: Optimize Lots of Objects](https://threejs.org/manual/en/optimize-lots-of-objects.html): объединение и управление отрисовкой объектов. Применены отсечение дальних экземпляров для камеры, сохранение исходных экземпляров для теней и участки поверхности с общими атрибутами.

Источники просмотрены 13 сентября 2026; изменения выполнены в существующем Three.js проекта без обновления движка.

## v0.6.19 — вода и мокрые поверхности

- Three.js Reflector, официальный исходный код: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Reflector.js — зеркальная камера, проекция текстуры, наклонная плоскость отсечения и повторное использование теней. В игре один общий буфер для всех луж.
- Three.js MeshPhysicalMaterial: https://threejs.org/docs/pages/MeshPhysicalMaterial.html — шероховатость и физические свойства поверхностей. В игре вода неметаллическая, отражение зависит от угла взгляда; конденсат повышает шероховатость окон.

Применены инженерные приближения под бюджет браузера: малое разрешение отражений, ограниченная частота обновления, отдельные травинки и объёмные лучи в отражении не рассчитываются.
