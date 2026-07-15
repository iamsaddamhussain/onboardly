using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onboardly.Server.Migrations
{
    /// <inheritdoc />
    public partial class WorkScheduleAndMissingPunch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "AutoCheckoutEnabled",
                table: "Organizations",
                newName: "FlagMissingPunches");

            migrationBuilder.AddColumn<int>(
                name: "BreakMinutes",
                table: "Organizations",
                type: "integer",
                nullable: false,
                defaultValue: 60);

            migrationBuilder.AddColumn<int>(
                name: "WorkDays",
                table: "Organizations",
                type: "integer",
                nullable: false,
                defaultValue: 31);

            migrationBuilder.AddColumn<int>(
                name: "EarlyLeaveMinutes",
                table: "AttendanceRecords",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "LateMinutes",
                table: "AttendanceRecords",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BreakMinutes",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "WorkDays",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "EarlyLeaveMinutes",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "LateMinutes",
                table: "AttendanceRecords");

            migrationBuilder.RenameColumn(
                name: "FlagMissingPunches",
                table: "Organizations",
                newName: "AutoCheckoutEnabled");
        }
    }
}
