import { BgPicture } from "./types";

export const BG_VIDEOS: BgPicture[] = [
  ['https://performous.org/bgs/GoldenDust.webm', 'brightness(0.5) contrast(1.7) blur(4px)'],
  ...[
    // some videos from https://www.pexels.com/search/videos/looping%20background/
    ['production ID_4990245'],
    ['production ID_4990250', 'brightness(0.6) contrast(1.6)'],
    ['pexels-ehab-el-gapry-6238188', 'brightness(0.5) contrast(1.5)'],
    ['pexels-rostislav-uzunov-5680034'],
    ['pexels-rostislav-uzunov-8303104', 'brightness(0.4) contrast(1.5)'],
    ['pexels-rostislav-uzunov-9629254', 'brightness(0.4) contrast(1.4) blur(4px)'],
    ['pexels-rostislav-uzunov-9629255', 'brightness(0.5) contrast(1.4) blur(3px)'],
    ['production ID_4210523', 'brightness(0.6) contrast(1.3)'],
    ['production ID_4779866', 'brightness(0.5) contrast(1.3)'],
    ['production ID_4990235', 'brightness(1) contrast(1.2)'],
    ['production ID_4990241', 'brightness(0.6) contrast(1.3)'],
    ['production ID_4990242', 'brightness(0.5) contrast(1.4)'],
  ].map(v => [`https://pub-d909a0daa125478d9db850d4da553bc4.r2.dev/video_${v[0]}.mp4`, v[1]] as [string,string])
]
