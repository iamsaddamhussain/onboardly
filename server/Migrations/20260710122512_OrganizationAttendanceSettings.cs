using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onboardly.Server.Migrations
{
    /// <inheritdoc />
    public partial class OrganizationAttendanceSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoCheckoutEnabled",
                table: "Organizations",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "TimeZone",
                table: "Organizations",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "UTC");

            migrationBuilder.AddColumn<TimeOnly>(
                name: "WorkdayEnd",
                table: "Organizations",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(18, 0, 0));

            migrationBuilder.AddColumn<TimeOnly>(
                name: "WorkdayStart",
                table: "Organizations",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(9, 0, 0));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoCheckoutEnabled",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "TimeZone",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "WorkdayEnd",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "WorkdayStart",
                table: "Organizations");
        }
    }
}
