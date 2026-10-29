import React from 'react';
import { AbsoluteFill, Audio, Composition, Sequence, staticFile } from 'remotion';
import assets from './assets.json';
import { Captions, Finish } from './fx';
import { FPS, TOTAL_SECONDS, sceneLen } from './config';
import { Hook, Intro, Problem } from './scenesA';
import { Demo, Security, Verify } from './scenesB';
import { Adal, End, Market, Stack } from './scenesC';

const order = [
  ['hook', Hook],
  ['problem', Problem],
  ['intro', Intro],
  ['demo', Demo],
  ['security', Security],
  ['verify', Verify],
  ['stack', Stack],
  ['market', Market],
  ['adal', Adal],
  ['end', End],
] as const;

const Pitch: React.FC = () => {
  let at = 0;
  return (
    <>
      <AbsoluteFill style={{ background: '#fbfdfc' }} />
      {order.map(([key, Scene]) => {
        const from = at;
        const len = Math.round(sceneLen(key) * FPS);
        at += len;
        return (
          <Sequence key={key} from={from} durationInFrames={len} name={key}>
            <Scene />
          </Sequence>
        );
      })}
      <Captions />
      <Finish />
      {assets.voice ? <Audio src={staticFile(assets.voice)} /> : null}
      {assets.music ? <Audio src={staticFile(assets.music)} volume={0.07} loop /> : null}
    </>
  );
};

export const Root: React.FC = () => (
  <Composition id="DarbyPitch" component={Pitch} durationInFrames={Math.round(TOTAL_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
);
