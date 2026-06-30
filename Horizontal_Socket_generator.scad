// Gridfinity flat socket holder
// Sockets lie horizontally in curved cradles. Everything is in mm.
// Made by Mason Lee and Codex

$fn = 96;                  // Circle segments: higher is smoother but renders slower

// ---- INPUT ----
// Set switches to 1 to enable them or 0 to disable them.
Enabled_magnet = 0;        // Add four magnet pockets beneath every grid cell
Enabled_labels = 0;        // Engrave each socket's label near its cradle
margin_x = 2;              // Horizontal space around and between cradles
margin_y = 2;              // Vertical space around cradle rows
bed_size = "250X250";      // Printer bed size: X width by Y depth
height = 2;                // Holder height above the base, in 7 mm units
Alignment = "top_left";    // top_left, top_right, center_left, center, center_right, bottom_left, or bottom_right
socket_layout = "grid";    // grid, free, or compact

// Each inner list is a row. Use diameter, "diameter/label", or 0 for a gap.
socket_diams = [
    ["19.86/38/14mm", "17.86/36/13mm", "16.91/35/12mm"],
    ["15.85/34/11mm", "13.96/32/10mm", 0]
];

// ---- SOCKET CRADLE SETTINGS ----
fit_clearance = 0.6;       // Extra mm added to the cradle diameter
length_clearance = 1;      // Extra total mm added to the cradle length
recess_fraction = 0.40;    // Portion of socket diameter recessed into the top
floor_thickness = 3;       // Solid material left below the deepest cradle

label_size = 5;            // OpenSCAD text size in mm
label_depth = 0.7;         // Label engraving depth in mm
label_socket_gap = 3;      // Space in mm between a cradle end and its label
label_collision_clearance = 0.5; // Extra clearance around labels

// ---- GRIDFINITY SETTINGS ----
grid = 42;                 // Gridfinity cell pitch in mm

base_h = 7;                // Total Gridfinity base height in mm
base_profile_h = 4.75;     // Height of the tapered foot profile
base_bridge_h = base_h - base_profile_h;

base_top = 41.5;           // Width of each foot at the top
base_bottom = 35.6;        // Width of each foot at the bottom
base_r_top = 3.75;         // Top foot/body corner radius
base_r_bottom = 0.8;       // Bottom foot corner radius

magnet_d = 6.2;            // Magnet-pocket diameter
magnet_h = 2.2;            // Magnet-pocket depth

screw_holes = false;       // true adds four screw holes per grid cell
screw_d = 3.2;             // Screw-hole diameter
screw_h = 7;               // Screw-hole depth

hole_from_cell_edge = 8;   // Magnet/screw center distance from cell edges

// ---- DERIVED ----
rows = len(socket_diams);
cols = max([for (row = socket_diams) len(row)]);

layout_max_d = max([
    for (row = socket_diams)
        for (entry = row)
            if (socket_diameter(entry) > 0)
                socket_diameter(entry) + fit_clearance
]);

layout_max_l = max([
    for (row = socket_diams)
        for (entry = row)
            if (socket_diameter(entry) > 0)
                socket_length(entry) + length_clearance
]);

layout_max_w = max([
    for (row = socket_diams)
        for (entry = row)
            if (socket_diameter(entry) > 0)
                entry_width(entry)
]);

grid_pitch_x = layout_max_w + margin_x;
grid_pitch_y = layout_max_l + margin_y + label_band();

required_x = socket_layout == "grid"
    ? cols * layout_max_w + (cols + 1) * margin_x
    : max([for (r = [0 : rows - 1]) row_width(r)]);

required_y = socket_layout == "grid"
    ? rows * layout_max_l + (rows + 1) * margin_y +
        rows * label_band()
    : list_sum([for (r = [0 : rows - 1]) row_height(r)]) +
        margin_y;

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
assert(recess_fraction > 0 && recess_fraction <= 0.5,
    "recess_fraction must be greater than 0 and no more than 0.5");
assert(
    Alignment == "top_left" || Alignment == "top_right" ||
    Alignment == "center_left" || Alignment == "center" ||
    Alignment == "center_right" || Alignment == "bottom_left" ||
    Alignment == "bottom_right",
    "Unknown Alignment value"
);
assert(socket_layout == "grid" || socket_layout == "free",
    "socket_layout must be grid or free");

// ---- BUILD ----
difference() {
    union() {
        gridfinity_base(base_cols, base_rows);

        translate([0, 0, base_h])
            rounded_box(body_x, body_y, holder_h, base_r_top);
    }

    socket_cradles();

    if (Enabled_labels)
        engraved_labels();

    if (Enabled_magnet)
        gridfinity_magnet_holes(base_cols, base_rows);

    if (screw_holes)
        gridfinity_screw_holes(base_cols, base_rows);
}

// ---- HORIZONTAL SOCKET CRADLES ----
module socket_cradles() {
    for (r = [0 : rows - 1]) {
        for (c = [0 : len(socket_diams[r]) - 1]) {
            entry = socket_diams[r][c];
            d = socket_diameter(entry);

            if (d > 0) {
                cradle_d = d + fit_clearance;
                cradle_l = socket_length(entry) + length_clearance;
                recess = effective_recess(entry);

                // The cylinder axis runs front-to-back along the Y direction.
                translate([
                    socket_x(r, c),
                    socket_y(r) + cradle_l / 2,
                    total_h + cradle_d / 2 - recess
                ])
                    rotate([90, 0, 0])
                        cylinder(h = cradle_l, d = cradle_d);
            }
        }
    }
}

// ---- GRIDFINITY BASE ----
module gridfinity_base(nx, ny) {
    union() {
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

        translate([0, 0, base_profile_h])
            rounded_box(body_x, body_y, base_bridge_h, base_r_top);
    }
}

module gridfinity_foot() {
    union() {
        rounded_hull_box(
            base_bottom, base_bottom,
            37.2, 37.2,
            0.8, base_r_bottom, 1.6
        );

        translate([0, 0, 0.8])
            rounded_box(37.2, 37.2, 1.8, 1.6);

        translate([0, 0, 2.6])
            rounded_hull_box(
                37.2, 37.2,
                base_top, base_top,
                2.15, 1.6, base_r_top
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

// ---- INPUT PARSING ----
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
    is_string(value)
        ? let(first = slash_index(value, 1))
          parse_number(value, 0, first)
        : is_list(value) ? value[0] : 0;

function socket_length(value) =
    is_string(value)
        ? let(
            first = slash_index(value, 1),
            second = slash_index(value, 2)
          )
          parse_number(value, first + 1, second)
        : is_list(value) && len(value) > 1 ? value[1] : 0;

function socket_label(value) =
    is_string(value)
        ? let(second = slash_index(value, 2))
          string_from(value, second + 1)
        : is_list(value) && len(value) > 2 ? value[2] : "";

function effective_recess(entry) =
    min(
        (socket_diameter(entry) + fit_clearance) * recess_fraction,
        holder_h - floor_thickness
    );

// ---- LAYOUT HELPERS ----
function label_band() = Enabled_labels ? label_socket_gap + label_size : 0;

function label_width(entry) =
    len(socket_label(entry)) * label_size * 0.65;

function entry_width(entry) =
    Enabled_labels
        ? max(socket_diameter(entry) + fit_clearance,
            label_width(entry) + label_collision_clearance)
        : socket_diameter(entry) + fit_clearance;

function row_max_l(r) =
    let(active = [
        for (entry = socket_diams[r])
            if (socket_diameter(entry) > 0)
                socket_length(entry) + length_clearance
    ])
    len(active) == 0 ? 0 : max(active);

function row_width(r) =
    let(active = [
        for (entry = socket_diams[r])
            if (socket_diameter(entry) > 0)
                entry_width(entry)
    ])
    list_sum(active) + margin_x * (len(active) + 1);

function row_height(r) = row_max_l(r) + margin_y + label_band();

function widths_before(r, c, i = 0) =
    i >= c ? 0 :
    widths_before(r, c, i + 1) +
        (socket_diameter(socket_diams[r][i]) > 0
            ? entry_width(socket_diams[r][i]) + margin_x
            : 0);

function heights_before(r, i = 0) =
    i >= r ? 0 : row_height(i) + heights_before(r, i + 1);

function socket_x(r, c) =
    socket_layout == "grid"
        ? content_left(required_x) + margin_x + layout_max_w / 2 +
            c * grid_pitch_x
        : row_left(r) + margin_x + widths_before(r, c) +
            entry_width(socket_diams[r][c]) / 2;

function socket_y(r) =
    socket_layout == "grid"
        ? content_top() - margin_y - layout_max_l / 2 -
            r * grid_pitch_y
        : content_top() - heights_before(r) - margin_y -
            row_max_l(r) / 2;

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

// ---- ENGRAVED LABELS ----
module engraved_labels() {
    for (r = [0 : rows - 1]) {
        for (c = [0 : len(socket_diams[r]) - 1]) {
            entry = socket_diams[r][c];

            if (socket_diameter(entry) > 0) {
                translate([
                    socket_x(r, c),
                    socket_y(r) -
                        (socket_length(entry) + length_clearance) / 2 -
                        label_socket_gap,
                    total_h - label_depth
                ])
                    linear_extrude(label_depth + 0.1)
                        text(
                            socket_label(entry),
                            size = label_size,
                            halign = "center",
                            valign = "top"
                        );
            }
        }
    }
}

// ---- GEOMETRY HELPERS ----
module rounded_box(x, y, z, r) {
    linear_extrude(z)
        offset(r = r)
            square([x - 2 * r, y - 2 * r], center = true);
}

module rounded_hull_box(x1, y1, x2, y2, h, r1, r2) {
    hull() {
        linear_extrude(0.01)
            offset(r = r1)
                square([x1 - 2 * r1, y1 - 2 * r1], center = true);

        translate([0, 0, h])
            linear_extrude(0.01)
                offset(r = r2)
                    square([x2 - 2 * r2, y2 - 2 * r2], center = true);
    }
}
