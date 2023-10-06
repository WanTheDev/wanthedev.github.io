import {showcase} from '../data'
import StarryArea from './StarryArea'
import GlowingImage from './GlowingImage'
import {Stack, Title, Flex, Box} from '@mantine/core'
import classes from './componentStyles/showcaseStyles.module.css'

export default function Showcase({showHalf, showcaseDir}:{showHalf:boolean, showcaseDir:boolean}) {
    const imageSkewAmount = 25
    return(
        <Stack gap="0">
          <Title c="text.0" ta="center">Showcase</Title>
          <Flex h="100%" wrap="wrap" gap="md" direction={(showcaseDir && showHalf) ? "column" : "row"} justify="space-around" align="center" pos="relative">
              {
              new Array(showHalf ? showcase.length/2 : showcase.length).fill(0).map((_, curPic) => {
                  return(
                  <Box
                    w={(showcaseDir && showHalf) ? "100%" : "45%"}
                    style={(showHalf) ? {} : {marginTop: `${curPic*imageSkewAmount - (imageSkewAmount*3*(+(curPic>1)) + imageSkewAmount * 0.5)}%`}}
                    
                    className={classes.hoverContainer}
                    key={curPic}
  
                    component="a"
                    href={showcase[curPic].link}
                    target="_blank">
                      <GlowingImage image={showcase[curPic].image} radius="xl"/>
                  </Box>
                  )
              })
              }
              <StarryArea />
          </Flex>
        </Stack>
    )
  }