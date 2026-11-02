"""Rigid layers cut from one coherent, assembled mechanical-hand painting."""

from math import atan2, degrees, hypot
from urllib.parse import quote


HAND_ATLAS = "hand-v4.webp"
HAND_ATLAS_SIZE = (1672, 941)
INDEX_CONTACT = ((1070, 335), (1286, 276), (1440, 294), (1578, 294))

# Every piece samples the same painting in its original coordinates. At contact
# the layers reconstruct that painting rather than arranging independent parts.
HAND_PARTS = {
    "forearm": ((0, 350, 750, 591), '<path d="M0 0H420L890 941H0Z"/>'),
    # The palm uses the complement of all moving parts; see hand_part_mask.
    "palm": ((580, 220, 580, 440), ""),
    # The root's outer bearing belongs to the palm. Only the outgoing finger
    # shell rotates over it, keeping the adjoining palm plate intact.
    "index-root": ((1065, 215, 245, 155), '<path d="M1080 230L1263 216L1302 240L1302 302L1250 329L1138 358Z"/>'),
    # Include the whole upper hinge cap. Leaving its bright top edge in the
    # palm creates a floating sliver when the middle phalanx bends away.
    "index-middle": ((1240, 200, 225, 145), '<path d="M1270 210L1315 220L1420 220L1463 251V323L1421 338L1300 329L1268 313L1259 277Z"/>'),
    "index-tip": ((1400, 180, 250, 195), '<path d="M1444 220H1672V380H1418V309L1428 274Z"/>'),
    "thumb": ((765, 470, 500, 245), '<path d="M850 480C885 474 931 480 964 501L994 526L1030 533L1113 540L1196 572L1249 610V683L1186 703L1110 700L1070 656L996 638L910 630L811 611L777 574V531L801 501Z"/>'),
    "middle": ((1090, 330, 280, 375), '<path d="M1115 335L1205 340L1310 400L1342 428L1358 570L1315 675L1250 690L1210 668L1245 600L1260 545L1255 475L1210 445L1110 405Z"/>'),
    "rear": ((1050, 365, 225, 360), '<path d="M1085 375L1175 400L1225 475L1250 520L1255 590L1210 660L1175 710L1125 715L1090 685L1102 635L1132 585L1135 545L1095 520L1070 480L1065 435Z"/>'),
}


def hand_part_mask(name, prefix="hand"):
    """Return a native SVG mask definition and its reference attribute."""
    identifier = f"{prefix}-{name}"
    if name == "palm":
        # A union of exclusions keeps original fingers from remaining as ghosts
        # behind animated copies. The wrist overlap connects to the fixed arm.
        exclusions = "".join(shape for part, (_, shape) in HAND_PARTS.items() if part != "palm")
        definition = (
            f'<mask id="{identifier}" maskUnits="userSpaceOnUse" '
            'x="0" y="0" width="1672" height="941" style="mask-type:luminance">'
            '<rect width="1672" height="941" fill="white"/>'
            f'<g fill="black">{exclusions}</g>'
            '<ellipse cx="650" cy="480" rx="70" ry="110" '
            'transform="rotate(-25 650 480)" fill="white"/></mask>'
        )
        return definition, f'mask="url(#{identifier})"'
    shape = HAND_PARTS[name][1]
    return f'<clipPath id="{identifier}">{shape}</clipPath>', f'clip-path="url(#{identifier})"'


def articulated_hand():
    masks = {name: hand_part_mask(name) for name in HAND_PARTS}
    definitions = "".join(definition for definition, _ in masks.values())
    vectors = [(bx - ax, by - ay) for (ax, ay), (bx, by) in zip(INDEX_CONTACT, INDEX_CONTACT[1:])]
    lengths = [hypot(x, y) for x, y in vectors]
    angles = [degrees(atan2(y, x)) for x, y in vectors]
    # A filter-local light field needs no second rendering of the hand. The
    # final atop operation preserves SourceGraphic's alpha, including its
    # antialiased edge over a brighter background.
    light_field = "data:image/svg+xml," + quote(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941">'
        '<defs><radialGradient id="light" gradientUnits="userSpaceOnUse" cx="1578" cy="294" r="610">'
        '<stop offset="0" stop-color="white" stop-opacity=".95"/>'
        '<stop offset=".3" stop-color="white" stop-opacity=".65"/>'
        '<stop offset=".65" stop-color="white" stop-opacity=".2"/>'
        '<stop offset="1" stop-color="white" stop-opacity="0"/>'
        '</radialGradient></defs><rect width="1672" height="941" fill="url(#light)"/></svg>',
        safe="",
    )

    def piece(name, transform=""):
        return f'<g transform="{transform}"><use href="#hand-atlas" {masks[name][1]}/></g>'

    return f"""<div class="portal-hand-art">
      <img class="portal-hand-fallback" src="assets/hand-rig/{HAND_ATLAS}" data-fallback="assets/portal/robot-hand.webp" width="1672" height="941" alt="" fetchpriority="high" decoding="async">
      <svg class="portal-hand-rig" viewBox="0 0 1672 941" aria-hidden="true" focusable="false" data-atlas="assets/hand-rig/{HAND_ATLAS}">
        <defs>
          <image id="hand-atlas" width="1672" height="941"/>
          {definitions}
          <filter id="hand-contact-reflection" filterUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" color-interpolation-filters="sRGB">
            <feImage href="{light_field}" x="0" y="0" width="1672" height="941" result="contact-field"/>
            <feComponentTransfer in="contact-field" result="contact-strength">
              <feFuncA class="portal-hand-warm" type="linear" slope="0"/>
            </feComponentTransfer>
            <feColorMatrix in="SourceGraphic" result="warm-color" type="matrix" values=".7 0 0 0 .3  0 .83 0 0 .17  0 0 .94 0 .06  0 0 0 1 0"/>
            <feComposite in="warm-color" in2="contact-strength" operator="in" result="reflected-light"/>
            <feComposite in="reflected-light" in2="SourceGraphic" operator="atop"/>
          </filter>
        </defs>
        <g filter="url(#hand-contact-reflection)">
        <g id="hand-geometry">
        {piece("forearm")}
        <g transform="translate(650 480)">
          <g data-hand-joint="wrist">
            <g transform="translate(-650 -480)">
              <g transform="translate(1110 445)">
                <g data-hand-joint="rear">
                  {piece("rear", "translate(-1110 -445)")}
                </g>
              </g>
              <g transform="translate(1120 380)">
                <g data-hand-joint="middle">
                  {piece("middle", "translate(-1120 -380)")}
                </g>
              </g>
              {piece("palm")}
              <g transform="translate(1070 335) rotate({angles[0]:.6f})">
                <g data-hand-joint="index-root">
                  {piece("index-root", f"rotate({-angles[0]:.6f}) translate(-1070 -335)")}
                  <g transform="translate({lengths[0]:.6f} 0) rotate({angles[1] - angles[0]:.6f})">
                    <g data-hand-joint="index-middle">
                      {piece("index-middle", f"rotate({-angles[1]:.6f}) translate(-1286 -276)")}
                      <g transform="translate({lengths[1]:.6f} 0) rotate({angles[2] - angles[1]:.6f})">
                        <g data-hand-joint="index-tip">
                          {piece("index-tip", "translate(-1440 -294)")}
                          <g data-hand-tip="" transform="translate({lengths[2]:.6f} 0)"></g>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
              <g transform="translate(848 515)">
                <g data-hand-joint="thumb">
                  {piece("thumb", "translate(-848 -515)")}
                </g>
              </g>
            </g>
          </g>
        </g>
        </g>
        </g>
      </svg>
    </div>"""
