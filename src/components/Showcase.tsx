import {showcase} from '../data'
import StarryArea from './StarryArea'
import GlowingImage from './GlowingImage'
import {Stack, Title} from '@mantine/core'
import classes from './componentStyles/showcaseStyles.module.css'
import { useMediaQuery } from '@mantine/hooks'

export default function Showcase() {
    const imageSkewAmount = 25
    const showHalf = useMediaQuery('(max-width: 85em)') || false
    return(
        <Stack gap="0">
          <Title c="text.0" ta="center">Showcase</Title>
          <div className={classes.showcaseContainer}>
              {
              new Array(showHalf ? showcase.length/2 : showcase.length).fill(0).map((_, curPic) => {
                  return(
                  <a
                    
                    style={(showHalf) ? {} : {marginTop: `${curPic*imageSkewAmount - (imageSkewAmount*3*(+(curPic>1)) + imageSkewAmount * 0.5)}%`}}
                    
                    className={classes.hoverContainer}
                    key={curPic}
  
                    href={showcase[curPic].link}
                    target="_blank"
                  >
                      <GlowingImage image={showcase[curPic].image} radius="xl"/>
                  </a>
                  )
              })
              }
              <StarryArea />
          </div>
        </Stack>
    )
  }