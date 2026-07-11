import * as THREE from 'three'

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

export function getSubsolarPoint(date = new Date()) {
  const jd = date.getTime() / 86400000 + 2440587.5
  const n = jd - 2451545.0

  const meanLong = (280.46 + 0.9856474 * n) % 360
  const meanAnom = ((357.528 + 0.9856003 * n) % 360) * DEG
  const eclLong =
    (meanLong + 1.915 * Math.sin(meanAnom) + 0.02 * Math.sin(2 * meanAnom)) * DEG
  const obliquity = (23.439 - 0.0000004 * n) * DEG

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclLong)) * RAD

  let rightAsc =
    Math.atan2(Math.cos(obliquity) * Math.sin(eclLong), Math.cos(eclLong)) * RAD
  rightAsc = (rightAsc + 360) % 360

  const gmst = (280.46061837 + 360.98564736629 * n) % 360

  let lon = rightAsc - gmst
  lon = ((((lon + 180) % 360) + 360) % 360) - 180

  return { lat: declination, lon }
}

export function latLonToVector3(
  lat: number,
  lon: number,
  radius = 1,
  target = new THREE.Vector3(),
) {
  const phi = lat * DEG
  const lam = lon * DEG
  const cosPhi = Math.cos(phi)
  return target.set(
    radius * cosPhi * Math.cos(lam),
    radius * Math.sin(phi),
    -radius * cosPhi * Math.sin(lam),
  )
}

export function getSunDirection(date = new Date(), target = new THREE.Vector3()) {
  const { lat, lon } = getSubsolarPoint(date)
  return latLonToVector3(lat, lon, 1, target).normalize()
}
