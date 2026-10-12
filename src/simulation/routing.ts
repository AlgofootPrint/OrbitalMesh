import type { NetworkLink, RoutingWeights } from './models';

export const defaultRoutingWeights: RoutingWeights = {
  packetLoss: 600,
  congestion: 85,
  availability: 80,
};

export const routeCostParts = (link: NetworkLink, weights: RoutingWeights) => {
  const packetLossWeight = link.packetLoss * weights.packetLoss;
  const congestionWeight = link.congestion * weights.congestion;
  const availabilityPenalty = (1 - link.availability) * weights.availability;
  return {
    latency: link.latency,
    packetLossWeight,
    congestionWeight,
    availabilityPenalty,
    total: link.latency + packetLossWeight + congestionWeight + availabilityPenalty,
  };
};

export const routeCost = (link: NetworkLink, weights: RoutingWeights = defaultRoutingWeights) => {
  return routeCostParts(link, weights).total;
};

export const findBestRoute = (
  links: NetworkLink[],
  source: string,
  target: string,
  weights: RoutingWeights = defaultRoutingWeights,
) => {
  const activeLinks = links.filter((link) => link.active && link.availability > 0.1);
  const nodes = new Set<string>([source, target]);
  activeLinks.forEach((link) => {
    nodes.add(link.source);
    nodes.add(link.target);
  });

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set(nodes);

  nodes.forEach((node) => {
    distances.set(node, node === source ? 0 : Number.POSITIVE_INFINITY);
    previous.set(node, null);
  });

  while (unvisited.size > 0) {
    let current: string | null = null;
    unvisited.forEach((node) => {
      if (current === null || (distances.get(node) ?? Infinity) < (distances.get(current) ?? Infinity)) {
        current = node;
      }
    });

    if (!current || current === target) break;
    const currentNode = current;
    unvisited.delete(currentNode);

    activeLinks
      .filter((link) => link.source === currentNode || link.target === currentNode)
      .forEach((link) => {
        const neighbor = link.source === currentNode ? link.target : link.source;
        if (!unvisited.has(neighbor)) return;
        const candidate = (distances.get(currentNode) ?? Infinity) + routeCost(link, weights);
        if (candidate < (distances.get(neighbor) ?? Infinity)) {
          distances.set(neighbor, candidate);
          previous.set(neighbor, currentNode);
        }
      });
  }

  if (!Number.isFinite(distances.get(target) ?? Infinity)) {
    return { path: [] as string[], cost: Infinity, latency: 0 };
  }

  const path: string[] = [];
  let cursor: string | null = target;
  while (cursor) {
    path.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  const latency = path.slice(0, -1).reduce((total, node, index) => {
    const next = path[index + 1];
    const link = activeLinks.find(
      (candidate) =>
        (candidate.source === node && candidate.target === next) ||
        (candidate.source === next && candidate.target === node),
    );
    return total + (link?.latency ?? 0);
  }, 0);

  return { path, cost: distances.get(target) ?? Infinity, latency };
};

export const routeContainsLink = (route: string[], link: NetworkLink) => {
  return route.some((node, index) => {
    const next = route[index + 1];
    return (
      next !== undefined &&
      ((node === link.source && next === link.target) || (node === link.target && next === link.source))
    );
  });
};
