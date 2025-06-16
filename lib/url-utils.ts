import { toSlug } from './slug.js';

export function normalizeForUrl(str:string){
  return toSlug(str);
}


export function getHierarchyUrl(
  region?: string,
  district?: string,
  hromada?: string,
) {
  return ['/hierarchy']
    .concat(region ? [normalizeForUrl(region)] : [])
    .concat(district ? [normalizeForUrl(district)] : [])
    .concat(hromada ? [normalizeForUrl(hromada)] : [])
    .join('/');
}