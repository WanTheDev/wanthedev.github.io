import { Container, Image } from "@mantine/core";
import classes from './componentStyles/imageStyles.module.css'
import { useState } from "react";
export default function GlowingImage({image, radius='', loading="lazy"}:{image:string, radius?: string, loading?: "lazy" | "eager"}) {
    const [animDelay, _] = useState(Math.floor(Math.random()*-6500))
    const animDir = (animDelay > -3250) ? 'normal' : 'reverse'
    return(
        <Container pos="relative" className={classes.container} data-loaded={true} size="max">
            <Image loading={loading} height="100%" left="0" top="0" fit="cover" data-blurry aria-hidden pos="absolute" src={image} className={classes.floating} style={{animationDelay: animDelay+'ms', animationDirection: animDir}}/>
            <Image loading={loading} data-radius={radius} src={image} className={classes.floating} aria-hidden style={{animationDelay: animDelay+'ms', animationDirection: animDir}}/>
        </Container>
    )
  }