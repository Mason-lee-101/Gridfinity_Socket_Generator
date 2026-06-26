// Gridfinity vertical socket holder - all dimensions are in mm.
// See Readme.md for complete setup and input instructions.
// Made by Mason Lee and Codex

$fn = 96;                  // Circle segments: higher is smoother but renders slower

// ---- INPUT ----
Enable_tapered_socket = 0; // 1 = use "bottomsize/topsize/label" entries
Enabled_magnet = 0;        // 1 = magnet pockets, 0 = disabled
Enabled_labels = 0;        // 1 = engraved labels, 0 = disabled
margin_x = 3;              // Horizontal spacing around sockets
margin_y = 2;              // Vertical spacing around socket rows
bed_size = "250X250";      // Printer bed size: X width by Y depth
height = 2;                // Height above base in 7 mm units
Alignment = "top_left";    // See Readme.md for alignment choices
socket_layout = "compact"; // grid, free, or compact

// Each inner list is a row. Use diameter, "diameter/label", or 0 for a gap.
// If Enable_tapered_socket = 1, strings can use "bottomsize/topsize/label".
socket_diams = [
    ["43.97/32mm", "43.82/31mm", "42.76/30mm", "41.94/29mm", "41.01/28mm"],
    ["38.5/27mm", "37.01/26mm", "35.86/25mm", "34.2/24mm", "33.88/23mm", "31.83/22mm"],
    ["29.98/21mm", "29.92/17mm", "29.89/19mm", "29.89/20mm", "29.85/18mm", "24.88/14mm"],
    ["24.86/11mm", "24.85/16mm", "24.84/8mm", "24.83/13mm", "24.83/10mm", "24.82/9mm", "24.82/12mm", "24.82/15mm"]
];

// ---- SOCKET SETTINGS ----
fit_clearance = 0.6;       // Extra hole diameter
hole_depth = 25;           // Maximum socket depth
floor_thickness = 3;       // Material beneath socket holes

label_size = 5;            // Text size
label_depth = 0.7;         // Engraving depth
label_hole_gap = 3;        // Space between hole and label
label_collision_clearance = 0.5; // Compact-layout clearance

// ---- GRIDFINITY SETTINGS ----
grid = 42;                 // Gridfinity cell pitch

base_h = 7;                // Base height
base_profile_h = 4.75;     // Foot-profile height
base_bridge_h = base_h - base_profile_h;

base_top = 41.5;           // Foot width at top
base_bottom = 35.6;        // Foot width at bottom

base_r_top = 3.75;         // Top corner radius
base_r_bottom = 0.8;       // Bottom corner radius

magnet_d = 6.2;            // Magnet-pocket diameter
magnet_h = 2.2;            // Magnet-pocket depth

screw_holes = false;       // Enable bottom screw holes
screw_d = 3.2;             // Screw-hole diameter
screw_h = 7;               // Screw-hole depth

hole_from_cell_edge = 8;   // Hole-center distance from cell edges

// ---- DERIVED ----
rows = len(socket_diams);
cols = max([for (r = socket_diams) len(r)]);

// Pack sockets by their actual diameters and margins, then round the finished
// bin up to whole Gridfinity cells.
layout_max_d = max([
    for (row = socket_diams)
        for (entry = row)
            if (socket_diameter(entry) > 0)
                socket_diameter(entry) + fit_clearance
]);
grid_pitch_x = layout_max_d + margin_x;
grid_pitch_y = layout_max_d + margin_y + label_band();

required_x = socket_layout == "grid"
    ? cols * layout_max_d + (cols + 1) * margin_x
    : max([for (r = [0 : rows - 1]) row_width(r)]);
required_y = socket_layout == "grid"
    ? rows * layout_max_d + (rows + 1) * margin_y +
        rows * label_band()
    : list_sum([for (r = [0 : rows - 1]) row_height(r)]) + margin_y;
base_cols = max(1, ceil((required_x + 0.5) / grid));
base_rows = max(1, ceil((required_y + 0.5) / grid));

body_x = base_cols * grid - 0.5;
body_y = base_rows * grid - 0.5;

bed_separator = bed_separator_index(bed_size);
bed_x = bed_separator > 0
    ? parse_bed_number(bed_size, 0, bed_separator)
    : 0;
bed_y = bed_separator > 0 && bed_separator < len(bed_size) - 1
    ? parse_bed_number(bed_size, bed_separator + 1, len(bed_size))
    : 0;

holder_h = height * 7;
total_h = base_h + holder_h;
effective_hole_depth = min(hole_depth, holder_h - floor_thickness);

assert(holder_h > floor_thickness,
    "height must leave room for the floor_thickness");
assert(
    is_string(bed_size) && bed_separator > 0 &&
        bed_separator < len(bed_size) - 1 &&
        valid_bed_number(bed_size, 0, bed_separator) &&
        valid_bed_number(bed_size, bed_separator + 1, len(bed_size)) &&
        bed_x > 0 && bed_y > 0,
    "bed_size must use the format 250X250"
);
assert(
    body_x <= bed_x && body_y <= bed_y,
    str("Holder footprint ", body_x, "X", body_y,
        " mm exceeds bed_size ", bed_size)
);
assert(
    Alignment == "top_left" || Alignment == "top_right" ||
    Alignment == "center_left" || Alignment == "center" ||
    Alignment == "center_right" || Alignment == "bottom_left" ||
    Alignment == "bottom_right",
    "Unknown Alignment value"
);
assert(
    socket_layout == "grid" || socket_layout == "free" ||
    socket_layout == "compact",
    "Unknown socket_layout value"
);


// ---- BUILD ----
difference() {
    union() {
        gridfinity_base(base_cols, base_rows);

        translate([0, 0, base_h])
            rounded_box(body_x, body_y, holder_h, base_r_top);
    }

    socket_holes();

    if (Enabled_labels)
        engraved_labels();

    if (Enabled_magnet)
        gridfinity_magnet_holes(base_cols, base_rows);

    if (screw_holes)
        gridfinity_screw_holes(base_cols, base_rows);
}


// ---- SOCKET HOLES ----
module socket_holes() {
    for (r = [0 : rows - 1]) {
        for (c = [0 : len(socket_diams[r]) - 1]) {
            entry = socket_diams[r][c];
            d = socket_diameter(entry);

            if (d > 0) {
                translate([
                    socket_x(r, c),
                    socket_y(r, c),
                    total_h - effective_hole_depth
                ])
                    cylinder(
                        h = effective_hole_depth + 0.25,
                        d = socket_hole_diameter(entry) + fit_clearance
                    );
            }
        }
    }
}





// ---- CORRECTED GRIDFINITY BASE ----
module gridfinity_base(nx, ny) {
    union() {
        // One Gridfinity foot per cell.
        for (x = [0 : nx - 1]) {
            for (y = [0 : ny - 1]) {
                translate([
                    (x - (nx - 1) / 2) * grid,
                    (y - (ny - 1) / 2) * grid,
                    0
                ])
                    gridfinity_foot();
            }
        }

        // Continuous bridge tying all feet together.
        translate([0, 0, base_profile_h])
            rounded_box(body_x, body_y, base_bridge_h, base_r_top);
    }
}


// One 1x1 Gridfinity bottom foot.
// Profile:
// z 0.00  : 35.6 mm bottom
// z 0.80  : first 45° chamfer
// z 2.60  : vertical wall section
// z 4.75  : second 45° chamfer to 41.5 mm top
module gridfinity_foot() {
    union() {
        rounded_hull_box(
            base_bottom,
            base_bottom,
            37.2,
            37.2,
            0.8,
            base_r_bottom,
            1.6
        );

        translate([0, 0, 0.8])
            rounded_box(37.2, 37.2, 1.8, 1.6);

        translate([0, 0, 2.6])
            rounded_hull_box(
                37.2,
                37.2,
                base_top,
                base_top,
                2.15,
                1.6,
                base_r_top
            );
    }
}


// ---- MAGNET / SCREW HOLES ----
module gridfinity_magnet_holes(nx, ny) {
    for (x = [0 : nx - 1]) {
        for (y = [0 : ny - 1]) {
            cx = (x - (nx - 1) / 2) * grid;
            cy = (y - (ny - 1) / 2) * grid;

            for (sx = [-1, 1]) {
                for (sy = [-1, 1]) {
                    translate([
                        cx + sx * (base_top / 2 - hole_from_cell_edge),
                        cy + sy * (base_top / 2 - hole_from_cell_edge),
                        -0.05
                    ])
                        cylinder(h = magnet_h + 0.1, d = magnet_d);
                }
            }
        }
    }
}

module gridfinity_screw_holes(nx, ny) {
    for (x = [0 : nx - 1]) {
        for (y = [0 : ny - 1]) {
            cx = (x - (nx - 1) / 2) * grid;
            cy = (y - (ny - 1) / 2) * grid;

            for (sx = [-1, 1]) {
                for (sy = [-1, 1]) {
                    translate([
                        cx + sx * (base_top / 2 - hole_from_cell_edge),
                        cy + sy * (base_top / 2 - hole_from_cell_edge),
                        -0.05
                    ])
                        cylinder(h = screw_h + 0.1, d = screw_d);
                }
            }
        }
    }
}


// ---- SOCKET PACKING HELPERS ----
function list_sum(values, i = 0) =
    i >= len(values) ? 0 : values[i] + list_sum(values, i + 1);

function slash_index(value, occurrence = 1, i = 0, found = 0) =
    i >= len(value) ? -1 :
    value[i] == "/"
        ? found + 1 == occurrence
            ? i
            : slash_index(value, occurrence, i + 1, found + 1)
        : slash_index(value, occurrence, i + 1, found);

function bed_separator_index(value, i = 0) =
    !is_string(value) || i >= len(value) ? -1 :
    value[i] == "X" || value[i] == "x" ? i :
    bed_separator_index(value, i + 1);

function valid_bed_number(value, start, end, i = 0, digits = 0, dots = 0) =
    start + i >= end ? digits > 0 && dots <= 1 :
    digit_value(value[start + i]) >= 0
        ? valid_bed_number(value, start, end, i + 1, digits + 1, dots)
        : value[start + i] == "." && dots == 0
            ? valid_bed_number(value, start, end, i + 1, digits, dots + 1)
            : false;

function digit_value(char) =
    char == "0" ? 0 : char == "1" ? 1 : char == "2" ? 2 :
    char == "3" ? 3 : char == "4" ? 4 : char == "5" ? 5 :
    char == "6" ? 6 : char == "7" ? 7 : char == "8" ? 8 :
    char == "9" ? 9 : -1;

function parse_number(value, start, end, i = 0, result = 0, decimal = 0) =
    start + i >= end ? result :
    value[start + i] == "."
        ? parse_number(value, start, end, i + 1, result, 0.1)
        : let(digit = digit_value(value[start + i]))
          parse_number(
              value, start, end, i + 1,
              decimal == 0 ? result * 10 + digit : result + digit * decimal,
              decimal == 0 ? 0 : decimal / 10
          );

function parse_bed_number(value, start, end, i = 0, result = 0, decimal = 0) =
    start + i >= end ? result :
    value[start + i] == "."
        ? parse_bed_number(value, start, end, i + 1, result, 0.1)
        : let(digit = digit_value(value[start + i]))
          parse_bed_number(
              value, start, end, i + 1,
              decimal == 0 ? result * 10 + digit : result + digit * decimal,
              decimal == 0 ? 0 : decimal / 10
          );

function string_from(value, i) =
    i >= len(value) ? "" : str(value[i], string_from(value, i + 1));

function socket_diameter(value) =
    max(socket_bottom_diameter(value), socket_top_diameter(value));

function socket_bottom_diameter(value) =
    is_string(value)
        ? let(first = slash_index(value, 1))
          parse_number(value, 0, first < 0 ? len(value) : first)
        : is_list(value) ? value[0] : value;

function socket_top_diameter(value) =
    is_string(value)
        ? let(
            first = slash_index(value, 1),
            second = slash_index(value, 2)
          )
          Enable_tapered_socket && second > 0
              ? parse_number(value, first + 1, second)
              : socket_bottom_diameter(value)
        : is_list(value) && Enable_tapered_socket && len(value) > 1
            ? value[1]
            : socket_bottom_diameter(value);

function socket_hole_diameter(value) =
    Enable_tapered_socket ? socket_bottom_diameter(value) : socket_diameter(value);

function socket_label(value) =
    is_string(value)
        ? let(
            first = slash_index(value, 1),
            second = slash_index(value, 2),
            label_start = Enable_tapered_socket && second > 0
                ? second + 1
                : first + 1
          )
          (first < 0 ? value : string_from(value, label_start))
        : is_list(value)
            ? Enable_tapered_socket && len(value) > 2
                ? value[2]
                : len(value) > 1 ? value[1] : str(value)
            : str(value);

function row_max_d(r) =
    let(active = [for (entry = socket_diams[r])
        if (socket_diameter(entry) > 0) socket_diameter(entry) + fit_clearance])
    len(active) == 0 ? 0 : max(active);

function row_width(r) =
    let(active = [for (entry = socket_diams[r])
        if (socket_diameter(entry) > 0) socket_diameter(entry) + fit_clearance])
    list_sum(active) + margin_x * (len(active) + 1);

// Grid/free reserve a full strip for labels. Compact keeps the labels but lets
// them use row margins and the spare area created by Gridfinity cell rounding.
function label_band() =
    Enabled_labels && socket_layout != "compact"
        ? label_hole_gap + label_size
        : 0;

// Approximate OpenSCAD's proportional text width for compact collision tests.
// A small safety factor keeps labels clear across typical sans-serif fonts.
function label_width(entry) =
    len(socket_label(entry)) * label_size * 0.65;

// Reserve the nominal text height so font differences cannot consume the
// compact-layout safety clearance.
function label_height() = label_size;

// Compare compact-row positions before the Gridfinity-sized body exists.
// The body's left/center/right offset is shared by every row and cancels out
// of collision tests, so using local coordinates avoids a dependency loop:
// body_x -> required_y -> compact_label_step() -> socket_x() -> body_x.
function compact_row_left(r) =
    Alignment == "top_left" || Alignment == "center_left" ||
        Alignment == "bottom_left"
        ? 0
        : Alignment == "top_right" || Alignment == "center_right" ||
            Alignment == "bottom_right"
            ? -row_width(r)
            : -row_width(r) / 2;

function compact_socket_x(r, c) =
    compact_row_left(r) + margin_x + widths_before(r, c) +
        (socket_diameter(socket_diams[r][c]) + fit_clearance) / 2;

function label_overlaps_hole(r, label_c, hole_c) =
    abs(compact_socket_x(r, label_c) -
        compact_socket_x(r + 1, hole_c)) <
        label_width(socket_diams[r][label_c]) / 2 +
        (socket_diameter(socket_diams[r + 1][hole_c]) + fit_clearance) / 2;

// Vertical positions relative to a row's top edge. These mirror socket_y()
// without depending on body_y or required_y, which are not known yet.
function compact_socket_y_from_row_top(r, c) =
    let(diameter = socket_diameter(socket_diams[r][c]) + fit_clearance)
    Alignment == "top_left" || Alignment == "top_right"
        ? -diameter / 2
        : Alignment == "bottom_left" || Alignment == "bottom_right"
            ? -row_max_d(r) + diameter / 2
            : -row_max_d(r) / 2;

function compact_label_bottom(r, c) =
    compact_socket_y_from_row_top(r, c) -
        (socket_diameter(socket_diams[r][c]) + fit_clearance) / 2 -
        label_hole_gap - label_height();

function compact_hole_top(r, c) =
    compact_socket_y_from_row_top(r, c) +
        (socket_diameter(socket_diams[r][c]) + fit_clearance) / 2;

// Row-to-row distance needed to put a lower hole completely below a label.
function compact_label_clearance(r, label_c, hole_c) =
    compact_hole_top(r + 1, hole_c) - compact_label_bottom(r, label_c) +
        label_collision_clearance;

function compact_label_step(r) =
    !Enabled_labels || r >= rows - 1 ? 0 :
    let(clearances = [
        for (label_c = [0 : len(socket_diams[r]) - 1])
            for (hole_c = [0 : len(socket_diams[r + 1]) - 1])
                if (socket_diameter(socket_diams[r][label_c]) > 0 &&
                    socket_diameter(socket_diams[r + 1][hole_c]) > 0 &&
                    label_overlaps_hole(r, label_c, hole_c))
                    compact_label_clearance(r, label_c, hole_c)
    ])
    len(clearances) == 0 ? 0 : max(clearances);

function row_height(r) =
    socket_layout == "compact"
        ? r == rows - 1 && Enabled_labels
            ? row_max_d(r) + max(margin_y,
                label_hole_gap + label_height())
            : max(row_max_d(r) + margin_y, compact_label_step(r))
        : row_max_d(r) + margin_y + label_band();

function widths_before(r, c, i = 0) =
    i >= c ? 0 :
    widths_before(r, c, i + 1) +
        (socket_diameter(socket_diams[r][i]) > 0
            ? socket_diameter(socket_diams[r][i]) + fit_clearance + margin_x
            : 0);

function heights_before(r, i = 0) =
    i >= r ? 0 : row_height(i) + heights_before(r, i + 1);

function socket_x(r, c) =
    socket_layout == "grid"
        ? content_left(required_x) + margin_x + layout_max_d / 2 +
            c * grid_pitch_x
        : row_left(r) + margin_x + widths_before(r, c) +
            (socket_diameter(socket_diams[r][c]) + fit_clearance) / 2;

function socket_y(r, c) =
    let(
        diameter = socket_diameter(socket_diams[r][c]) + fit_clearance,
        row_top = content_top() - heights_before(r) - margin_y
    )
    socket_layout == "grid"
        ? content_top() - margin_y - layout_max_d / 2 -
            r * grid_pitch_y
        : Alignment == "top_left" || Alignment == "top_right"
            ? row_top - diameter / 2
            : Alignment == "bottom_left" || Alignment == "bottom_right"
                ? row_top - row_max_d(r) + diameter / 2
                : row_top - row_max_d(r) / 2;

function content_left(content_width) =
    Alignment == "top_left" || Alignment == "center_left" ||
        Alignment == "bottom_left"
        ? -body_x / 2
        : Alignment == "top_right" || Alignment == "center_right" ||
            Alignment == "bottom_right"
            ? body_x / 2 - content_width
            : -content_width / 2;

function row_left(r) =
    Alignment == "top_left" || Alignment == "center_left" ||
        Alignment == "bottom_left"
        ? -body_x / 2
        : Alignment == "top_right" || Alignment == "center_right" ||
            Alignment == "bottom_right"
            ? body_x / 2 - row_width(r)
            : -row_width(r) / 2;

function content_top() =
    Alignment == "top_left" || Alignment == "top_right"
        ? body_y / 2
        : Alignment == "bottom_left" || Alignment == "bottom_right"
            ? -body_y / 2 + required_y
            : required_y / 2;


// ---- GEOMETRY HELPERS ----
module rounded_box(x, y, z, r) {
    linear_extrude(z)
        offset(r = r)
            square([x - 2 * r, y - 2 * r], center = true);
}

module rounded_hull_box(x1, y1, x2, y2, h, r1, r2) {
    hull() {
        translate([0, 0, 0])
            linear_extrude(0.01)
                offset(r = r1)
                    square([x1 - 2 * r1, y1 - 2 * r1], center = true);

        translate([0, 0, h])
            linear_extrude(0.01)
                offset(r = r2)
                    square([x2 - 2 * r2, y2 - 2 * r2], center = true);
    }
}


// ---- ENGRAVED LABELS ----
module engraved_labels() {
    for (r = [0 : rows - 1]) {
        for (c = [0 : len(socket_diams[r]) - 1]) {
            entry = socket_diams[r][c];
            d = socket_diameter(entry);

            if (d > 0) {
                translate([
                    socket_x(r, c),
                    socket_y(r, c) - (d + fit_clearance) / 2 - label_hole_gap,
                    total_h - label_depth
                ])
                    linear_extrude(label_depth + 0.1)
                        text(socket_label(entry), size = label_size,
                            halign = "center", valign = "top");
            }
        }
    }
}
