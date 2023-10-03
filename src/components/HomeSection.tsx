import { Container, Flex, Group, Stack } from "@mantine/core";
import StarryArea from "./StarryArea";
//import classes from '../styles/homeStyles.module.css'
import GlowingImage from "./GlowingImage";
import {useMediaQuery} from '@mantine/hooks'
import React from 'react'

export default function HomeSection({icons, children, side=true}:{icons: Array<string>, children: Array<JSX.Element>, side?:boolean}) {
    const largeScreen = useMediaQuery('(min-width: 60em)');
    
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