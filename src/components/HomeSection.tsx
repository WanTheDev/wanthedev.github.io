import { Container, Flex, Group, Stack } from "@mantine/core";
import StarryArea from "./StarryArea";
//import classes from '../styles/homeStyles.module.css'
import GlowingImage from "./GlowingImage";
import {useMediaQuery} from '@mantine/hooks'
import React from 'react'

/*
function GlowingImage({image}:{image:string}) {
    return(
    <>
        <Image src={image} className={classes.floating} data-blurry pos="absolute" />
        <Image src={image} className={classes.floating} />
    </>
    )
}
function GlowingIcon({image}:{image:string}) {
    const largeScreen = useMediaQuery('(min-width: 60em)');

    return(
        <Container style={{zIndex: 1, maxWidth: "50vw", maxHeight: `${largeScreen ? "35" : "20"}vh`, aspectRatio: 1}} p={0} pos="relative">
            <Image pos="absolute" src={image} className={classes.floating} data-blurry/>
            <Image pos="absolute" src={image} className={classes.floating}/>
        </Container>
    )
}
*/

export default function HomeSection({icons, children, side=true}:{icons: Array<string>, children: Array<JSX.Element>, side?:boolean}) {
    const largeScreen = useMediaQuery('(min-width: 60em)');
    //const smallScreen = useMediaQuery('(max-width: 32em)');
    //const [pictureSeeds, _setPictureSeeds] = useState(Array(icons.length).fill(0).map(() => Math.round(Math.random()*255)))
  
    const sectionElements = [
        <Group w={largeScreen ? "40%" : "100%"} gap="md" wrap="nowrap" grow>
          {
              icons.map((curIcon:string, curIndex:number) => 
              <Container w="100%" maw="30vh" key={curIndex} pos="relative" p={0}>
                  <GlowingImage image={curIcon}/>
                  <StarryArea />
              </Container>
              )
          }
        </Group>
    ]
  
    const textSection = 
    <Stack w={largeScreen ? "40%" : "100%"}>
        {children.map((c:JSX.Element) => c)}
    </Stack>
  
    if (side || !largeScreen) { sectionElements.push(textSection) }
    else { sectionElements.unshift(textSection) }
  
    return(
        <Flex direction={largeScreen ? "row" : "column"} mt={largeScreen ? "xl" : "0"} gap="xl" align="center" justify="space-evenly">
        {
            sectionElements.map((curElement, curIndex) => <React.Fragment key={curIndex}>{curElement}</React.Fragment>)
        }
        </Flex>
    )
  }