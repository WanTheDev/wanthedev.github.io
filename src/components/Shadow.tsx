export default function Shadow() {
    return(
        <div style={{position: "absolute", width: "100%", height: "100%", backgroundColor: "black", filter: "blur(1.5em)", zIndex: -1, opacity: 0.4, outline: "2rem solid black"}} />
    )
}