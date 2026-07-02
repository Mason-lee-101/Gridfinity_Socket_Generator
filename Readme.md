# Gridfinity Socket Holder Generators

A pair of customizable OpenSCAD generators for vertical and horizontal Gridfinity socket holders. 


## Requirements
Current requirements are as follows:

- [OpenSCAD](https://openscad.org/)
- Calipers for measuring the outside diameter of each socket

> Note: I hope it will get hosted somewhere for everyone to use.

## Quick start
1. Measure the sockets that you want to create a holder for. 
1. Open `Vertical_Socket_generator.scad` or `Horizontal_Socket_generator.scad` in OpenSCAD.
2. Adjust the settings near the top of the file.
3. Replace the example `socket_diams` rows with your socket measurements.

4. Select **File > Export > Export as STL**.

> Note: All measurements in the generator are millimeters.

## Vertical Socket Generator
<details>
<summary>Click to expand</summary>
`socket_diams` is a list of rows. Rows are placed from top to bottom, and entries within each row are placed from left to right.

```scad
socket_diams = [
    ["19.86/14mm", "17.86/13mm", "16.91/12mm"],
    [27.14, 24.78, 0],
    ["9.19/1/4", "11.1/3/8"]
];
```

- A number such as `27.14` creates a hole for a socket with a 27.14 mm outside diameter.
- A string such as `"19.86/14mm"` creates a 19.86 mm hole with the custom label `14mm`.
- Only the first slash separates the diameter and label, so `"9.19/1/4"` produces the fractional label `1/4`.
- Set `Enable_tapered_socket = 1` for tapered sockets and enter them as `"bottomsize/topsize/label"`, such as `"33.5/36/36mm"`. The socket hole stays straight using `bottomsize`; `topsize` is used for layout spacing.
- A `0` leaves an empty position, which is especially useful in the `grid` layout.
- Add another inner `[ ... ]` list, separated by a comma, to create another row.

</details>

## Horizontal Socket Generator

<details>
<summary>Click to expand</summary>
Open `Horizontal_Socket_generator.scad` to create a holder where sockets lie horizontally. Its input format includes both the outside diameter and complete socket length:

```scad
socket_diams = [
    ["19.86/38/14mm", "17.86/36/13mm"],
    ["12.5/50/1/4", 0]
];
```

The format is `"diameter/length/label"`. For example, `"19.86/38/14mm"` means a 19.86 mm diameter socket that is 38 mm long and labeled `14mm`. 

Sockets run front-to-back in shallow curved cradles. Adjust `recess_fraction` to change how deeply they sit; values above `0.5` are intentionally rejected to avoid trapping sockets in an undercut.

</details>

## Main settings
<details>
<summary>Click to expand</summary>

### Features

```scad
Enabled_magnet = 0;
Enabled_labels = 0;
```

Use `1` to enable a feature and `0` to disable it. Magnet pockets are added beneath every Gridfinity cell. Labels are engraved beside their matching holes.

Optional screw holes are controlled separately:

```scad
screw_holes = false;
```
</details>

### Spacing and height
<details>
<summary>Click to expand</summary>

```scad
margin_x = 2;
margin_y = 2;
bed_size = "250X250";
height = 2;
```

`margin_x` controls horizontal spacing between sockets and at the left and right holder edges. `margin_y` controls spacing between socket rows and at the top and bottom edges. Increasing either value can make the holder occupy more Gridfinity cells.

`bed_size` is the printer's usable X-by-Y area in millimeters. Enter it as `"250X250"`. The generator reports an error when the finished Gridfinity footprint is wider or deeper than this size.

`height` is the holder height above the 7 mm base, expressed in 7 mm units:

- `1` = 7 mm above the base
- `2` = 14 mm above the base - **Default**
- `3` = 21 mm above the base

When the holder is shorter than the requested `hole_depth`, the holes are shortened automatically to preserve `floor_thickness`.

</details>

### Alignment Settings
<details>
<summary>Click to expand</summary>

```scad
Alignment = "top_left";
```

Available positions are:

- `"top_left"`
- `"top_right"`
- `"center_left"`
- `"center"`
- `"center_right"`
- `"bottom_left"`
- `"bottom_right"`

Alignment positions the complete socket layout inside the Gridfinity-sized holder.

### Layout modes

```scad
socket_layout = "grid";
```

- `"grid"` gives every socket an equally sized position based on the largest socket. Use it for straight, evenly aligned rows and columns.

```text
Row 1:  O   O   O   O
Row 2:  O   O   O   O
Row 3:  O   O   O   O
Row 4:  O   O   O   O
```

- `"stagger"` is available in the vertical generator. It shifts every other row by half of the largest socket pitch and reduces row spacing where the sockets can nest without touching.

```text
Row 1:  O   O   O   O
Row 2:    O   O   O   O
Row 3:  O   O   O   O
Row 4:    O   O   O   O
```

- `"free"` uses each socket's actual width while retaining normal row spacing. Rows stay straight, but small sockets do not consume the same width as large sockets.

```text
Row 1:  O     O    O
Row 2:  O  O      O
Row 3:  O    O  O
```

- `"compact"` packs sockets and rows tightly and accounts for label clearance. This is usually the smallest layout when you want the generator to remove unused space.

```text
Row 1:  O     O    O
Row 2:  O  O      O
Row 3:   O    O  O
```
</details>

## Socket and label Settings
<details>
<summary>Click to expand</summary>

```scad
fit_clearance = 0.6;
hole_depth = 25;
floor_thickness = 3;

label_size = 5;
label_depth = 0.7;
Label_in_socket_hole = 0; // Vertical generator
label_hole_gap = 3;    // Vertical generator
label_socket_gap = 3;  // Horizontal generator
label_collision_clearance = 0.5;
```

- Increase `fit_clearance` if sockets fit too tightly; decrease it if they are too loose.
- `hole_depth` is the maximum insertion depth.
- `floor_thickness` is the solid material left beneath each socket.
- The label settings control text size, engraving depth, socket-to-label spacing, and label collision clearance.
- In the vertical generator, set `Label_in_socket_hole = 1` to engrave labels in the bottom of each socket hole instead of beside the hole.

Print a small test holder before generating a large set, since socket measurements and printer tolerances vary.
</details>

## Advanced Gridfinity Settings
<details>
<summary>Click to expand</summary>

These values normally do not need changing. They define the base profile and optional bottom holes used by both generators.

```scad
grid = 42;
base_h = 7;
base_profile_h = 4.75;
base_top = 41.5;
base_bottom = 35.6;
base_r_top = 3.75;
base_r_bottom = 0.8;

magnet_d = 6.2;
magnet_h = 2.2;
screw_holes = false;
screw_d = 3.2;
screw_h = 7;
hole_from_cell_edge = 8;
```

- `grid` is the 42 mm Gridfinity cell pitch.
- The base dimensions and radii define the tapered Gridfinity foot profile.
- `magnet_d` and `magnet_h` set the optional magnet-pocket size.
- Set `screw_holes` to `true` to add screw holes; `screw_d` and `screw_h` set their size.
- `hole_from_cell_edge` positions magnet and screw-hole centers inward from each cell edge.
</details>

## Render Quality Settings
<details>
<summary>Click to expand</summary>

```scad
$fn = 96;
```

This is the number of segments OpenSCAD uses to approximate circles. Higher values produce smoother holes but take longer to render. `48` is useful for faster previews, while `96` is a good final-quality setting.
</details>

## Project files

- `Vertical_Socket_generator.scad` - vertical socket-hole generator using diameter and label inputs
- `Horizontal_Socket_generator.scad` - horizontal socket-cradle generator using diameter, length, and label inputs

## License

This project is licensed under the [MIT License](LICENSE).
