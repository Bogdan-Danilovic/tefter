/**
 * Raspored preklapajućih termina u kolone. Pošto isti radnik SME da ima
 * paralelne termine (i prikazujemo sve u jednoj koloni bez obzira na radnika),
 * preklapajuće kartice moraju da stanu jedna pored druge.
 *
 * Algoritam: grupiši u klastere lančano-preklapajućih termina, pa unutar
 * klastera dodeli "lane" greedy-jem. left/width se računaju po broju lane-ova
 * u klasteru.
 */

export type Interval = { startMin: number; endMin: number };
export type Placed<T> = T & { lane: number; lanes: number };

export function packColumns<T extends Interval>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const result: Placed<T>[] = [];

  let cluster: T[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = []; // kraj poslednjeg termina po lane-u
    const withLane = cluster.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.endMin);
      } else {
        laneEnds[lane] = it.endMin;
      }
      return { it, lane };
    });
    const lanes = laneEnds.length;
    for (const { it, lane } of withLane) result.push({ ...it, lane, lanes });
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const it of sorted) {
    if (cluster.length > 0 && it.startMin >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flush();

  return result;
}
