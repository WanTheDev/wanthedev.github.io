import {Flex, Image, UnstyledButton, Group, rem} from '@mantine/core'
import {Link} from 'react-router-dom'
import classes from '../styles/headerStyles.module.css'
import {headerData} from '../data'
import { useHeadroom, useMediaQuery } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';

export default function Header() {
    const largeScreen = useMediaQuery('(min-width: 60em)') || false;
    const smallScreen = useMediaQuery('(max-width: 32em)') || false;
    //const headerHeight=100
    const ref = useRef<HTMLDivElement>(null)
    const [headerHeight, setHeight]=useState(100)
    const headerPinned=useHeadroom({ fixedAt: headerHeight})

    useEffect(() => {
        setHeight(ref?.current?.clientHeight || 0)
    })

    return(
        <>
        
        <Flex ref={ref} direction={largeScreen ? "row" : "column"} className={classes.headerClass} style={{transform: `translateY(${headerPinned ? 0 : rem(-headerHeight)})`}} justify={largeScreen ? "space-between" : "center"} >
            
            {/* Logo */}
            <Link to="/">
                <Image src={headerData.logo} />
            </Link>

            {/* Buttons */}
            <Group gap={largeScreen ? "xl" : "sm"} wrap={smallScreen ? 'nowrap' : 'wrap'} justify="center">
            {
                headerData.buttons.map((c) => {
                return(
                    <Link key={c.name} to={c.routeName}>
                    <UnstyledButton className={classes.headerButton} style={{
                        fontSize: smallScreen ? '0.8em' : (largeScreen ? '1.5em' : '1em'),
                        width: smallScreen ? rem(100) : (largeScreen ? rem(180) : rem(150))
                    }}>{c.name}</UnstyledButton>
                    </Link>
                )
                })
            } 
            </Group>

        </Flex>
        {/* Header spacer */}
        {/* without this the page content would overlap with the header due to the header having position set to fixed */}
        <div style={{height: `${headerHeight*0.8}px`}}></div>
        </>
    )
}