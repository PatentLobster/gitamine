import * as React from 'react';
import { RepoState, ChildrenType } from '../repo-state';
import { getBranchColor } from '../commit-graph';

const RADIUS = 11;
const OFFSET_X = 2 * RADIUS;
const OFFSET_Y = 28;

export interface GraphCanvasProps { repo: RepoState; }

export class GraphCanvas extends React.PureComponent<GraphCanvasProps, {}> {
  canvas: React.RefObject<HTMLCanvasElement>;
  offset: number;
  resizeObserver: any;

  constructor(props: GraphCanvasProps) {
    super(props);
    this.canvas = React.createRef<HTMLCanvasElement>();
    this.offset = 0;
  }

  componentDidMount() {
    if (this.canvas.current) {
      const canvas = this.canvas.current;
      const parent = canvas.parentElement!;
      canvas.height = parent.clientHeight;
      this.drawGraph();
      // Rerender on resize
      const handleResize = () => {
        if (canvas.height != parent.clientHeight) {
          canvas.height = parent.clientHeight;
          this.drawGraph();
        }
      };
      this.resizeObserver = new ResizeObserver(handleResize).observe(parent);
      // Rerender on scroll
      canvas.nextElementSibling!.addEventListener('scroll', (event) => {
        this.offset = event.target!.scrollTop;
        this.drawGraph();
      });
    }
  }

  drawGraph() {
    if (this.canvas.current) {
      this.canvas.current.width = this.props.repo.graph.width * OFFSET_X;
      const ctx = this.canvas.current.getContext('2d');
      if (ctx) {
        this.drawEdges(ctx);
        this.drawNodes(ctx);
      }
    }
  }

  drawNodes(ctx: CanvasRenderingContext2D) {
    for (let [commitSha, [i, j]] of this.props.repo.graph.positions) {
      const [x, y] = this.computeNodeCenterCoordinates(i, j);
      ctx.fillStyle = getBranchColor(j);
      ctx.beginPath();
      ctx.arc(x, y, RADIUS, 0, 2 * Math.PI, true);
      ctx.fill();
    }
  }

  drawEdges(ctx: CanvasRenderingContext2D) {
    const repo = this.props.repo;
    const positions = repo.graph.positions;
    for (let [commitSha, [i0, j0]] of positions) {
      const [x0, y0] = this.computeNodeCenterCoordinates(i0, j0);
      ctx.beginPath();
      for (let [childSha, type] of repo.children.get(commitSha) as [string, ChildrenType][]) {
        const [i1, j1] = positions.get(childSha) as [number, number];
        const [x1, y1] = this.computeNodeCenterCoordinates(i1, j1);
        ctx.moveTo(x0, y0);
        if (type === ChildrenType.Commit) {
          if (x0 < x1) {
            ctx.lineTo(x1 - RADIUS, y0);
            ctx.quadraticCurveTo(x1, y0, x1, y0 - RADIUS);
          } else {
            ctx.lineTo(x1 + RADIUS, y0);
            ctx.quadraticCurveTo(x1, y0, x1, y0 - RADIUS);
          }
        } else {
          if (x0 < x1) {
            ctx.lineTo(x0, y1 + RADIUS);
            ctx.quadraticCurveTo(x0, y1, x0 + RADIUS, y1);
          } else {
            ctx.lineTo(x0, y1 + RADIUS);
            ctx.quadraticCurveTo(x0, y1, x0 - RADIUS, y1);
          }
        }
        ctx.lineTo(x1, y1);
      }
      ctx.stroke();
    }
  }

  computeNodeCenterCoordinates(i: number, j: number) {
    return [j * OFFSET_X + RADIUS, 3 + i * OFFSET_Y + RADIUS - this.offset]
  }

  render() {
    return (
      <canvas ref={this.canvas} />
    );
  }
}