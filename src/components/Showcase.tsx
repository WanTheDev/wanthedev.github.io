import {showcase} from '../data'
import StarryArea from './StarryArea'
import GlowingImage from './GlowingImage'
import {Stack, Title} from '@mantine/core'
import classes from './componentStyles/showcaseStyles.module.css'
import { useMediaQuery } from '@mantine/hooks'

export default function Showcase() {
    const imageSkewAmount = 50
    const showHalf = useMediaQuery('(max-width: 85em)') ?? true
    return(
        <Stack className={classes.showcaseWrapper}>
          <Title c="text.0" ta="center">Showcase</Title>
          <div className={classes.showcaseContainer}>
              {
              // array filled with 0s is used to
              // show 4 of the showcase images
              // (wrapping and allat is handled in the showcaseStyles)
              [0,0,0,0].map((_, curPic) => {
                  return(
                  <a
                  
                    aria-label={showcase[curPic].ariaLabel}

                    style={(showHalf) ? {} : {marginTop: `${curPic*imageSkewAmount - (imageSkewAmount*3*(+(curPic>1)) + imageSkewAmount * 0.5)}%`}}
                    
                    className={classes.hoverContainer}
                    data-bottom-row={curPic>=2 ? true : null}
                    key={curPic}
  
                    href={showcase[curPic].link}
                    target="_blank"
                  >
                      <GlowingImage image={showcase[curPic].image} radius="xl" loading="eager"/>
                  </a>
                  )
              })
              }
              <StarryArea />
          </div>
        </Stack>
    )
  }