export const icons={
  cpp: '/icons/cpp.svg',
  css: '/icons/css.svg',
  express: '/icons/express.svg',
  firebase: '/icons/firebase.svg',
  github: '/icons/github.svg',
  gms2: '/icons/gms2.svg',
  html: '/icons/html.svg',
  itch: '/icons/itchio.svg',
  js: '/icons/js.svg',
  leetcode: '/icons/leetcode.svg',
  nodejs: '/icons/nodejs.svg',
  python: '/icons/python.svg',
  react: '/icons/react.svg',
  ts: '/icons/ts.svg',
  vite: '/icons/vite.svg',
  x: '/icons/x.svg',
  youtube: '/icons/youtube.svg',
  tauri: './icons/tauri.svg',
  electron: './icons/electron.svg'
}

export const stars={
  normal: '/icons/star.svg',
  shadow: '/icons/shadowStar.svg'
}

class imageLink {
  image: string
  link: string
  ariaLabel: string
  constructor(ariaLabel:string, image:string, link:string) {
    this.image='/images/'+image
    this.link=link
    this.ariaLabel=ariaLabel
  }
}
type imageLinkType = InstanceType<typeof imageLink>

export const gameImages={
  buttonsTrail: new imageLink('buttons trail game','buttonsTrail.webp', 'https://wansou.itch.io/buttons-trail'),
  doodleBullets: new imageLink('doodle bullets game','doodleBullets.webp','https://wansou.itch.io/doodle-bullets'),
  droidVisChanger: new imageLink('forager droid visibility changer mod', 'droidVisChanger.webp','https://steamcommunity.com/sharedfiles/filedetails/?id=1970775475'),
  dyingSwitch: new imageLink('dying switch game', 'dyingSwitch.webp','https://wansou.itch.io/dying-switch'),
  forwardAdventure: new imageLink('forward adventure game', 'forwardAdventure.webp','https://wansou.itch.io/forward-adventure'),
  idleParticles: new imageLink('idle particles game', 'idleParticles.webp','https://wansou.itch.io/idle-particle-simulator'),
  lootbags: new imageLink('forager lootbags mod', 'lootbags.webp','https://steamcommunity.com/sharedfiles/filedetails/?id=1977502034'),
  match2048: new imageLink('match 2048 game', 'match2048.webp','https://wansou.itch.io/match-2048'),
  quickCiv: new imageLink('quick civ game', 'quickCiv.webp','https://wansou.itch.io/quick-civ'),
}

export const miscImages={
  itchBanner: new imageLink('itch.io page', 'itchBanner.webp','https://wansou.itch.io'),
}

export const showcase=[
  gameImages.buttonsTrail,  gameImages.idleParticles,
  gameImages.doodleBullets, gameImages.forwardAdventure
]

class project {
  imageLink: imageLinkType
  name: string
  desc: string

  constructor(name: string, imageLink: imageLinkType, desc: string) {
    this.name=name
    this.imageLink=imageLink
    this.desc=desc
  }
}
//type projectType=InstanceType<typeof project>
export const projectData=[
  new project("Buttons trail", gameImages.buttonsTrail, "Embark on a classic Nokia-era puzzle adventure where you navigate through ever-shifting floors while activating buttons. Challenge yourself with four unique floor types and strategic gameplay as you progress through each level."),
  new project("Doodle bullets", gameImages.doodleBullets, "Navigate intense bullet-filled rounds, strategically allocating your cash to purchase artifacts, hearts, and shields in a bid to survive."),
  new project("Droid Vis Changer (forager)", gameImages.droidVisChanger, "Elevate your Forager experience with this mod, allowing you to adjust droid opacity through user-friendly keybinds."),
  new project("Dying switch", gameImages.dyingSwitch, "Explore a brief yet engaging platformer game where each time you meet your demise, a switch is either activated or deactivated."),
  new project("Forward adventure", gameImages.forwardAdventure, "Navigate challenging platform obstacles to reach the crown in this quick and straightforward game where your only option is to move forward."),
  new project("Idle particles", gameImages.idleParticles, "Engage in an idle game featuring a vibrant 2D particle simulation, offering a visually captivating experience while you manage and progress through the game."),
  new project("Lootbags (forager)", gameImages.lootbags, "Discover exciting LootBags in this Forager mod, obtainable through various in-game activities such as mining, killing, and more. Unveil their contents by subscribing to the mod and integrating it into your game for a thrilling surprise."),
  new project("Match 2048", gameImages.match2048, "Combine Match-3 gameplay with 2048 mechanics in this engaging puzzle game. Use arrow keys to control and aim for victory by achieving 2048 points or more."),
  new project("Quick civ", gameImages.quickCiv, "Take charge of a civilization of three individuals in Quick Civ, as you navigate the challenge of constructing a spaceship while facing moments of panic.")
]

class section {
  icons: Array<string>
  gradientColors: Array<string>
  title: string
  description: string

  constructor(icons:Array<string>, gradientColors:Array<string>, title:string, description:string) {
    this.icons=icons 
    this.gradientColors=gradientColors
    this.title=title
    this.description=description
  }
}
//type sectionDataType=InstanceType<typeof section>

export const aboutData=[
  "I've been programming since late 2018, starting with game development and later transitioning onto web development. I've created numerous games using Game Maker Studio 2, which uses the GML language; a fortunate overlap with JavaScript, making web development more accessible for me.",
  "I've always enjoyed learning new things and concepts in game development, pushing the boundaries of creativity and technical problem-solving in this field has seen me tackle a diverse range of projects, from 2D platformers to complex simulations, each teaching me valuable lessons in design, optimization, and user engagement. This hands-on experience has honed my ability to bring concepts to life while ensuring a seamless and enjoyable user experience."
]

export const sectionData=[
  new section(
    [icons.gms2, icons.js], ["white 40%", "gold 70%"],
    "GML & JS", "In web development, I've used my solid JavaScript skills to craft interactive and user-friendly web apps. This blend of game and web work has broadened my skill set and provided me with a unique perspective on merging gaming and web technologies. I'm excited about applying this mix of expertise to future projects and collaborations."),
  
  new section(
    [icons.nodejs], ["lawngreen", "limegreen"],
    "Node.js", "Diving into Node.js backend development was quite a challenge. I decided to venture into creating a multiplayer game, which, on the surface, seemed simpler than it turned out to be. I started with a swift GML game prototype and then connected multiple clients to a Node.js server. This experience served as a valuable introduction to backend development, and it has proven to be a useful foundation as I delved further into web development."),
  
  new section(
    [icons.html,icons.css,icons.react], ["orangered","#b15ba8 21%, royalblue 42%, #2bcbf2 63%, cyan"],
    "HTML, CSS & React","Then, I made the shift to web development, beginning with the basics of HTML and CSS before exploring various frameworks. Among them, React caught my attention because I found the concept of components incredibly appealing. The availability of component libraries made the process of creating web applications both smooth and efficient."),
  
  new section(
    [icons.vite,icons.ts],["darkorchid 30%", "royalblue 60%"],
    "Vite & Typescript","Later on, I found Vite, a tool that made setting up projects much faster. While using Vite, I also learned about Typescript. Despite my preference for JavaScript, I started using Typescript because it makes code safer and easier to understand. It's become a valuable part of my development toolkit."),
  
  new section(
    [icons.firebase],["orange", "gold 40%"],
    "Firebase","At that moment, I realized I was getting close to becoming a full-stack developer. So, I decided to use Firebase as a starting point for managing databases and backend development. I took on the challenge of creating a web store app with an admin panel, and to my pleasant surprise, it all went much smoother than I expected."),
  
  new section(
    [icons.express],["white", "gray"],
    "Express","Later on, I decided to explore more Node.js and its applications in building web servers. I took a course that taught me important concepts like middleware and security. As I progressed, I made the choice to transition to Express.js, driven by its user-friendly nature and ease of implementation."),
  
  new section(
    [icons.electron, icons.tauri], ["cyan", "#a1e463, orange"],
    "Electron & Tauri", "I've picked up electron after realising how simple it is, it barely changed my workflow and only made development more interesting, although I really hated how big electron apps were so I decided to also learn Tauri which is an awesome alternative but the switch-up forced me to learn a bit of Rust which I don't regert but I am not yet experienced enough with it to even put it on this list."
  ),
  
  new section(
    [icons.python,icons.cpp],["gold", "#e6bc5c 35%, #8e7ebe 45%, royalblue 50%"],
    "Python & C++","Before diving into web development, I learned Python and C++. While I haven't used them in my recent projects, it's important to note that I still possess a solid grasp of these languages. Although some time has passed since my last hands-on experience with Python and C++, my proficiency in both languages remains intact. I may not have had the chance to showcase them in recent work, but they are valuable tools that I can readily bring to the table when the need arises.")
]

class footerIcon {
  image: string
  link: string
  ariaLabel: string
  constructor(image:string, link:string, ariaLabel:string) {
    this.image = image
    this.link = link
    this.ariaLabel=ariaLabel
  }
}
class footerLink {
  text: string 
  link: string 
  constructor(text: string, link:string) {
    this.text = text
    this.link = link
  }
}

export const footerData={
  icons: [
    new footerIcon(icons.github, "https://github.com/WanTheDev", "Github"),
    new footerIcon(icons.x, "https://twitter.com/WanTheDev", "Twitter"),
    new footerIcon(icons.youtube,"https://www.youtube.com/channel/UCYkk_vCc9g36VvVQEF6_NAg", "Youtube"),
    new footerIcon(icons.itch,"https://wanthedev.itch.io", "Itch.io"),
    new footerIcon(icons.leetcode,"leetcode.com/WanTheDev", "Leetcode")
  ],
  links: [
    new footerLink("Vite", "https://vitejs.dev"),
    new footerLink("React", "https://react.dev"),
    new footerLink("Mantine", "https://mantine.dev"),
    new footerLink("Typescript", "https://www.typescriptlang.org"),
  ]
}

class headerButton {
  name: string
  routeName: string
  constructor(name:string, routeName:string) {
    this.name=name
    this.routeName=routeName
  }
}
export const headerData={
  buttons: [
    new headerButton('About', '/'),
    new headerButton('Contact', '/contact'),
    new headerButton('Projects', '/projects')
  ],
  logo: '/icons/logo.svg'
}