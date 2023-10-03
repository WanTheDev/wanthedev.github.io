import { Container, Image } from "@mantine/core";
import classes from '../styles/imageStyles.module.css'
//<Image left="0" top="0" fit="contain" w="auto" h="100%" pos="absolute" src={image} data-blurry className={classes.floating}/>
export default function GlowingImage({image, radius=0}:{image:string, radius?: string | number}) {
    const animDelay=Math.floor(Math.random()*-6500)
    const intenseGlow=false // fit=cover increases glow, not sure if i like it
    return(
        <Container style={{zIndex: 1}} pos="relative" size="max">
            <Image left="0" top="0%" h="100%" w="100%" fit={intenseGlow ? "cover" : "contain"} data-blurry pos="absolute" src={image} className={classes.floating}  style={{animationDelay: animDelay+'ms'}}/>
            <Image radius={radius} src={image} className={classes.floating} style={{animationDelay: animDelay+'ms'}}/>
        </Container>
    )
  }