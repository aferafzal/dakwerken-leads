import { Composition, Series, registerRoot } from 'remotion'
import { Scene1Probleem } from './scenes/Scene1Probleem'
import { Scene2Adres } from './scenes/Scene2Adres'
import { Scene3Meting } from './scenes/Scene3Meting'
import { Scene4Offerte } from './scenes/Scene4Offerte'
import { Scene5Resultaat } from './scenes/Scene5Resultaat'

// Totaal: 5 scenes × 90 frames = 450 frames @ 30fps = 15 seconden per scene = 75s totaal
// Aanpasbaar per scene hieronder

export const SCENE_DURATION = 90  // frames per scene

export function SpotableExplainer() {
  return (
    <Series>
      <Series.Sequence durationInFrames={SCENE_DURATION}>
        <Scene1Probleem />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATION}>
        <Scene2Adres />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATION}>
        <Scene3Meting />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATION}>
        <Scene4Offerte />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATION}>
        <Scene5Resultaat />
      </Series.Sequence>
    </Series>
  )
}

// Registratie voor Remotion Studio & renderMedia
export function RemotionRoot() {
  return (
    <Composition
      id="SpotableExplainer"
      component={SpotableExplainer}
      durationInFrames={SCENE_DURATION * 5}
      fps={30}
      width={1920}
      height={1080}
    />
  )
}

registerRoot(RemotionRoot)
