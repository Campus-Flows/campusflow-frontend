const aliases = {
  백주년: '백주년기념관', 체육관: '체육관(스포츠센터)', 대강당: '대강당(선교 70주년기념관)',
  제1실습관: '제1실습관/창업보육센터', 아트앤디자인: '아트 &amp; 디자인관',
  다니엘관: '다니엘관/요한관/박물관', 요한관: '다니엘관/요한관/박물관'
};

export function buildingCoordinates(locations, building) {
  const key = Object.hasOwn(aliases, building) ? aliases[building] : building;
  const point = locations?.[key];
  return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) ? point : null;
}
