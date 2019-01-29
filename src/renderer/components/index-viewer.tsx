import * as React from 'react';
import * as Git from 'nodegit';
import * as settings from 'electron-settings';
import { PatchList } from './patch-list';
import { PatchViewerMode } from './patch-viewer';
import { RepoState } from '../repo-state';
import { Field, getKey } from '../settings';

export interface IndexViewerProps { 
  repo: RepoState;
  selectedPatch: Git.ConvenientPatch | null;
  onPatchSelect: (patch: Git.ConvenientPatch | null, mode: PatchViewerMode) => void;
}

export interface IndexViewerState {
  unstagedPatches: Git.ConvenientPatch[];
  stagedPatches: Git.ConvenientPatch[];
  summary: string;
}

export class IndexViewer extends React.PureComponent<IndexViewerProps, IndexViewerState> {
  div: React.RefObject<HTMLDivElement>;
  index: Git.Index;

  constructor(props: IndexViewerProps) {
    super(props);
    this.div = React.createRef<HTMLDivElement>();
    this.state = {
      unstagedPatches: [],
      stagedPatches: [],
      summary: ''
    }
    this.handleUnstagedPatchSelect = this.handleUnstagedPatchSelect.bind(this);
    this.handleStagedPatchSelect = this.handleStagedPatchSelect.bind(this);
    this.stagePatch = this.stagePatch.bind(this);
    this.stageAll = this.stageAll.bind(this);
    this.unstagePatch = this.unstagePatch.bind(this);
    this.unstageAll = this.unstageAll.bind(this);
    this.handleSummaryChange = this.handleSummaryChange.bind(this);
    this.commit = this.commit.bind(this);
    this.getPatches();
  }

  handleUnstagedPatchSelect(patch: Git.ConvenientPatch) {
    this.props.onPatchSelect(patch, PatchViewerMode.Stage);
  }

  handleStagedPatchSelect(patch: Git.ConvenientPatch) {
    this.props.onPatchSelect(patch, PatchViewerMode.Unstage);
  }

  handleSummaryChange(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({summary: event.target.value});
  }

  async refresh() {
    await this.getPatches();
  }

  refreshSelectedPatch(unstagedPatch: boolean) {
    const patches = unstagedPatch ? 
      [this.state.unstagedPatches, this.state.stagedPatches] :
      [this.state.stagedPatches, this.state.unstagedPatches];
    const handler = unstagedPatch ? 
      [this.handleUnstagedPatchSelect, this.handleStagedPatchSelect] :
      [this.handleStagedPatchSelect, this.handleUnstagedPatchSelect];
    const path = this.props.selectedPatch!.newFile().path();
    for (let i = 0; i < patches.length; ++i) {
      for (let patch of patches[i]) {
        if (path === patch.newFile().path()) {
          handler[i].call(this, patch);
          return;
        }
      }
    }
    this.props.onPatchSelect(null, PatchViewerMode.ReadOnly);
  }

  resize(offset: number) {
    if (this.div.current) {
      this.div.current.style.width = `${this.div.current.clientWidth + offset}px`;
    }
  }

  async getPatches() {
    const repo = this.props.repo.repo;
    await this.props.repo.updateHead(); // Why is this necessary to have index up-to-date when changing branch
    const headCommit = this.props.repo.headCommit;
    const options = {
      flags: Git.Diff.OPTION.INCLUDE_UNTRACKED | 
        Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS
    }
    this.index = await repo.refreshIndex();
    const [unstagedDiff, stagedDiff] = await Promise.all([
      Git.Diff.indexToWorkdir(repo, this.index, options),
      Git.Diff.treeToIndex(repo, await headCommit.getTree(), this.index, options)
    ]);
    unstagedDiff.findSimilar({});
    stagedDiff.findSimilar({});
    return new Promise<void>(async (resolve) => {
      this.setState({
        unstagedPatches: await unstagedDiff.patches(),
        stagedPatches: await stagedDiff.patches()
      }, () => {
        resolve();
      });
    });
  }

  async stagePatch(patch: Git.ConvenientPatch) {
    if (patch.isDeleted()) {
      await this.index.removeByPath(patch.newFile().path())
      await this.index.write();
    } else {
      await this.index.addByPath(patch.newFile().path())
      await this.index.write();
    }
  }

  async stageAll() {
    const paths = this.state.stagedPatches.map((patch) => patch.newFile().path());
    await this.index.addAll(paths, Git.Index.ADD_OPTION.ADD_DEFAULT);
    await this.index.write();
  }

  async unstagePatch(patch: Git.ConvenientPatch) {
    const headCommit = this.props.repo.headCommit;
    await Git.Reset.default(this.props.repo.repo, headCommit, patch.newFile().path());
  }

  async unstageAll() {
    const paths = this.state.stagedPatches.map((patch) => patch.newFile().path());
    const headCommit = this.props.repo.headCommit;
    await Git.Reset.default(this.props.repo.repo, headCommit, paths);
  }

  async commit() {
    if (this.state.summary.length > 0) {
      const name = settings.get(getKey(Field.Name));
      const email = settings.get(getKey(Field.Email));
      const author = Git.Signature.now(name, email);
      const oid = await this.index.writeTree();
      const headCommit = this.props.repo.headCommit;
      await this.props.repo.repo.createCommit('HEAD', author, author, 
        this.state.summary, oid, [headCommit]);
      this.setState({
        summary: ''
      });
    }
  }

  render() {
    return (
      <div className='commit-viewer' ref={this.div}>
        <h2>Index</h2>
        <div className='button-inline'>
          <p>Unstaged files ({this.state.unstagedPatches.length})</p>
          <button disabled={this.state.unstagedPatches.length === 0}
            onClick={this.stageAll}>
            Stage all changes
          </button>
        </div>
        <PatchList patches={this.state.unstagedPatches}
          selectedPatch={this.props.selectedPatch}
          onPatchSelect={this.handleUnstagedPatchSelect} 
          onStage={this.stagePatch} />
        <div className='button-inline'>
          <p>Staged files ({this.state.stagedPatches.length})</p>
          <button disabled={this.state.stagedPatches.length === 0}
            onClick={this.unstageAll}>
            Unstage all changes
           </button>
        </div >
        <PatchList patches={this.state.stagedPatches}
          selectedPatch={this.props.selectedPatch}
          onPatchSelect={this.handleStagedPatchSelect}
          onUnstage={this.unstagePatch} />
        <input placeholder={'Summary'} 
          value={this.state.summary} 
          onChange={this.handleSummaryChange} />
        <button onClick={this.commit} disabled={this.state.summary.length === 0}>
          Commit
        </button>
      </div>
    );
  }
}