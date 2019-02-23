import * as React from 'react';
import { RepoState } from '../helpers/repo-state';
import { createStashContextMenu } from '../helpers/stash-context-menu';

export interface StashItemProps { 
  repo: RepoState;
  name: string;
  index: number;
  onClick: () => void;
}

export class StashItem extends React.PureComponent<StashItemProps, {}> {
  constructor(props: StashItemProps) {
    super(props);
    this.handleContextMenu = this.handleContextMenu.bind(this);
  }

  handleContextMenu(event: React.MouseEvent<HTMLSpanElement>) {
    event.preventDefault();
    const menu = createStashContextMenu(this.props.repo, this.props.index);
    menu.popup({});
  }

  render() {
    return (
      <li onClick={this.props.onClick} onContextMenu={this.handleContextMenu}>
        {this.props.name}
      </li>
    );
  }
}