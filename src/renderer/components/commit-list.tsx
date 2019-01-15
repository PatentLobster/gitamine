import * as React from 'react';
import * as Git from 'nodegit';
import { CommitItem } from './commit-item';
import { IndexItem } from './index-item';
import { RepoState } from "../repo-state";

const ITEM_HEIGHT = 28;

export interface CommitListProps { 
  repo: RepoState;
  selectedCommit: Git.Commit | null;
  onCommitSelect: (commit: Git.Commit) => void;
  onIndexSelect: () => void;
  onScroll: (height: number, start: number, end: number) => void;
  onResize: (offset: number, start: number, end: number) => void;
}

export interface CommitListState {
  start: number;
  end: number;
}

export class CommitList extends React.PureComponent<CommitListProps, CommitListState> {
  div: React.RefObject<HTMLDivElement>;
  resizeObserver: any;

  constructor(props: CommitListProps) {
    super(props);
    this.div = React.createRef();
    this.state = {
      start: 0,
      end: 0
    }
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  componentDidMount() {
    if (this.div.current) {
      this.resizeObserver = new ResizeObserver(this.handleResize).observe(this.div.current);
    }
  }

  handleScroll() {
    if (this.div.current) {
      const newState = this.computeState()!;
      this.props.onScroll(this.div.current.scrollTop, newState.start, newState.end);
      this.setState(newState);
    }
  }

  handleResize() {
    if (this.div.current) {
      const newState = this.computeState()!;
      this.props.onResize(this.div.current.clientHeight, newState.start, newState.end);
      this.setState(newState);
    }
  }

  handleKeyUp(event: React.KeyboardEvent<HTMLUListElement>) {
    event.preventDefault();
    if (event.keyCode === 38) {
      let i = this.props.selectedCommit ? 
        this.props.repo.commits.indexOf(this.props.selectedCommit) : -1;
      i = Math.max(i - 1, -1);
      if (i >= 0) {
        this.props.onCommitSelect(this.props.repo.commits[i])
      } else {
        this.props.onIndexSelect();
      }
      if (i <= this.state.start && this.div.current) {
        this.div.current.scrollTo(0, (i + 1) * ITEM_HEIGHT);
      }
    } else if (event.keyCode === 40) {
      let i = this.props.selectedCommit ? 
        this.props.repo.commits.indexOf(this.props.selectedCommit) : -1;
      i = Math.min(i + 1, this.props.repo.commits.length - 1);
      this.props.onCommitSelect(this.props.repo.commits[i])
      if (i >= this.state.end - 1 && this.div.current) {
        this.div.current.scrollTo(0, (i + 2) * ITEM_HEIGHT - this.div.current.clientHeight);
      }
    }
  }

  computeState() {
    const div = this.div.current!;
    // Take account of the index
    const top = div.scrollTop - ITEM_HEIGHT;
    const start = Math.floor(top / ITEM_HEIGHT);
    const end = Math.min(Math.ceil((top + div.clientHeight) / ITEM_HEIGHT), 
      this.props.repo.commits.length);
    return {
      start: start,
      end: end
    };
  }

  render() {
    // Select visible commits and add index if necessary
    const items: JSX.Element[] = [];
    if (this.state.start === -1) {
      items.push(<IndexItem selected={this.props.selectedCommit === null}
        onIndexSelect={this.props.onIndexSelect} 
        key='index' />);
    }
    const commits = this.props.repo.commits.slice(Math.max(this.state.start, 0), this.state.end);
    items.push(...commits.map((commit: Git.Commit) => (
      <CommitItem 
        repo={this.props.repo} 
        commit={commit} 
        selected={this.props.selectedCommit === commit} 
        onCommitSelect={this.props.onCommitSelect} 
        key={commit.sha()} />
    )));

    // Compute height of the divs
    const paddingTop = (this.state.start + 1) * ITEM_HEIGHT;
    const paddingBottom = (this.props.repo.commits.length - this.state.end) * ITEM_HEIGHT;
    const style = {
      paddingTop: paddingTop,
      paddingBottom: paddingBottom
    };

    return (
      <div className='commit-list' onScroll={this.handleScroll} ref={this.div}>
        <ul style={style} tabIndex={1} onKeyDown={this.handleKeyUp}>{items}</ul>
      </div>
    );
  }
}
