import { Circle, Ellipse, Line, Rect, Textbox, Triangle, FabricObject } from "fabric";
import { withData } from "./fabricHelpers";

const DEFAULT_FILL = "#4f7f60";

export function makeTextbox(center: { x: number; y: number }, fontFamily = "Montserrat"): Textbox {
  const box = new Textbox("Double-click to edit", {
    left: center.x,
    top: center.y,
    originX: "center",
    originY: "center",
    width: 220,
    fontSize: 28,
    fontFamily,
    fill: "#22301f",
    textAlign: "center",
  });
  return withData(box, { name: "Text" });
}

export function makeRect(center: { x: number; y: number }): Rect {
  const rect = new Rect({
    left: center.x,
    top: center.y,
    originX: "center",
    originY: "center",
    width: 160,
    height: 110,
    rx: 6,
    ry: 6,
    fill: DEFAULT_FILL,
  });
  return withData(rect, { name: "Rectangle" });
}

export function makeCircle(center: { x: number; y: number }): Circle {
  const circle = new Circle({
    left: center.x,
    top: center.y,
    originX: "center",
    originY: "center",
    radius: 80,
    fill: DEFAULT_FILL,
  });
  return withData(circle, { name: "Circle" });
}

export function makeOval(center: { x: number; y: number }): Ellipse {
  const ellipse = new Ellipse({
    left: center.x,
    top: center.y,
    originX: "center",
    originY: "center",
    rx: 100,
    ry: 65,
    fill: DEFAULT_FILL,
  });
  return withData(ellipse, { name: "Oval" });
}

export function makeTriangle(center: { x: number; y: number }): Triangle {
  const triangle = new Triangle({
    left: center.x,
    top: center.y,
    originX: "center",
    originY: "center",
    width: 140,
    height: 120,
    fill: DEFAULT_FILL,
  });
  return withData(triangle, { name: "Triangle" });
}

export function makeLine(center: { x: number; y: number }): Line {
  const line = new Line([center.x - 80, center.y, center.x + 80, center.y], {
    stroke: "#22301f",
    strokeWidth: 4,
    originX: "center",
    originY: "center",
  });
  return withData(line, { name: "Line" });
}

export function friendlyNameFor(obj: FabricObject): string {
  const data = (obj as any).data;
  if (data?.name) return data.name;
  const type = obj.type ?? "Object";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
