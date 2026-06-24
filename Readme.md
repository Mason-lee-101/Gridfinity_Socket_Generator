# Gridfinity Socket Holder Generators

A pair of customizable OpenSCAD generators for vertical and horizontal socket holders with Gridfinity-compatible bases. Enter your socket measurements, choose a layout, and the model automatically rounds the footprint up to whole 42 mm Gridfinity cells.

The project also includes a flat-socket generator for sockets that rest horizontally in curved cradles.

Created by Mason Lee and Codex.

## Requirements
Current requirements, I hope it would get hosted on https://gridfinity.perplexinglabs.com one day ^-^

- [OpenSCAD](https://openscad.org/)
- Calipers for measuring the outside diameter of each socket

## Quick start

1. Open `Vertical_Socket_generator.scad` or `Horizontal_Socket_generator.scad` in OpenSCAD.
2. Adjust the settings near the top of the file.
3. Replace the example `socket_diams` rows with your socket measurements.

4. Select **File > Export > Export as STL**.

All measurements in the generator are millimeters.

## Vertical socket input
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
- A `0` leaves an empty position, which is especially useful in the `grid` layout.
- Add another inner `[ ... ]` list, separated by a comma, to create another row.

Measure the widest outside diameter of each socket—usually the larger measurement from its two ends. The generator adds `fit_clearance` to this measurement automatically.

Ready-to-paste metric groups are available in `socket_diams_by_drive_metric.txt`. They are separated by drive size, impact/standard type, and deep/standard length.

</details>

## Horizontal socket input

<details>
<summary>Click to expand</summary>
Open `Horizontal_Socket_generator.scad` to create a holder where sockets lie horizontally. Its input format includes both the outside diameter and complete socket length:

```scad
socket_diams = [
    ["19.86/38/14mm", "17.86/36/13mm"],
    ["12.5/50/1/4", 0]
];
```

The format is `"diameter/length/label"`. For example, `"19.86/38/14mm"` means a 19.86 mm diameter socket that is 38 mm long and labeled `14mm`. Fractional labels still work because only the first two slashes separate the measurements.

Sockets run front-to-back in shallow curved cradles. Adjust `recess_fraction` to change how deeply they sit; values above `0.5` are intentionally rejected to avoid trapping sockets in an undercut.

</details>

## Main settings

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

### Spacing and height

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
- `2` = 14 mm above the base
- `3` = 21 mm above the base
- `4` = 28 mm above the base

When the holder is shorter than the requested `hole_depth`, the holes are shortened automatically to preserve `floor_thickness`.

### Alignment

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

- `"grid"` gives every socket an equally sized position based on the largest socket. Use it for straight, evenly aligned rows.
- `"free"` uses each socket's actual width while retaining normal row spacing.
- `"compact"` packs sockets and rows tightly and accounts for label clearance.

## Socket and label adjustments

```scad
fit_clearance = 0.6;
hole_depth = 25;
floor_thickness = 3;

label_size = 5;
label_depth = 0.7;
label_hole_gap = 3;
label_collision_clearance = 0.5;
```

- Increase `fit_clearance` if sockets fit too tightly; decrease it if they are too loose.
- `hole_depth` is the maximum insertion depth.
- `floor_thickness` is the solid material left beneath each socket.
- The label settings control text size, engraving depth, spacing, and compact-layout clearance.

Print a small test holder before generating a large set, since socket measurements and printer tolerances vary.

## Advanced Gridfinity settings

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

## Render quality

```scad
$fn = 96;
```

This is the number of segments OpenSCAD uses to approximate circles. Higher values produce smoother holes but take longer to render. `48` is useful for faster previews, while `96` is a good final-quality setting.

## Project files

- `Vertical_Socket_generator.scad` - vertical socket-hole generator using diameter and label inputs
- `Horizontal_Socket_generator.scad` - horizontal socket-cradle generator using diameter, length, and label inputs
