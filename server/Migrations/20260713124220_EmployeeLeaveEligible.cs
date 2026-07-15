using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onboardly.Server.Migrations
{
    /// <inheritdoc />
    public partial class EmployeeLeaveEligible : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "LeaveEligible",
                table: "Employees",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LeaveEligible",
                table: "Employees");
        }
    }
}
