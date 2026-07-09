// 주간 시간표에서 겹치는 일정의 가로 배치(lane) 계산 — 순수 로직, jest 테스트 대상.

export type Positioned<T> = {
  item: T;
  /** 0부터 시작하는 lane 번호 */
  lane: number;
  /** 이 아이템이 속한 겹침 클러스터의 총 lane 수 (가로 분할 수) */
  lanes: number;
};

/**
 * 시간순 그리디 lane 배정.
 * 서로 겹치는 이벤트 묶음(클러스터) 안에서 각 이벤트에 빈 lane을 배정하고,
 * 클러스터의 최대 lane 수를 lanes로 부여한다 (화면에서 너비 = 1/lanes).
 */
export function assignLanes<T>(
  items: T[],
  getStart: (t: T) => number,
  getEnd: (t: T) => number
): Positioned<T>[] {
  const sorted = [...items].sort((a, b) => getStart(a) - getStart(b) || getEnd(b) - getEnd(a));
  const result: Positioned<T>[] = [];

  let cluster: Positioned<T>[] = [];
  let laneEnds: number[] = []; // lane별 마지막 종료 시각
  let clusterEnd = -Infinity;

  const flush = () => {
    const lanes = laneEnds.length;
    for (const p of cluster) p.lanes = lanes;
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  };

  for (const item of sorted) {
    const start = getStart(item);
    const end = Math.max(getEnd(item), start + 1);
    if (start >= clusterEnd && cluster.length > 0) flush();

    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    const positioned: Positioned<T> = { item, lane, lanes: 1 };
    cluster.push(positioned);
    result.push(positioned);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return result;
}
