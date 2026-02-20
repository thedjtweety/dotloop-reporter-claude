#!/bin/bash

###############################################################################
# Dotloop Reporter - Systemd Service Deployment Script
#
# This script installs and configures systemd services for the Dotloop
# Reporter application and its health monitor.
#
# Usage:
#   sudo ./scripts/deploy-systemd.sh [install|uninstall|restart|status]
#
# Requirements:
#   - Ubuntu/Debian Linux with systemd
#   - sudo privileges
#   - Node.js 22+ installed
#   - Application built (pnpm build)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="dotloop-reporter"
HEALTH_MONITOR_NAME="dotloop-health-monitor"
APP_DIR="/home/ubuntu/dotloop-reporter"
SYSTEMD_DIR="/etc/systemd/system"
USER="ubuntu"
GROUP="ubuntu"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if systemd is available
    if ! command -v systemctl &> /dev/null; then
        print_error "systemd is not available on this system"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if application directory exists
    if [ ! -d "$APP_DIR" ]; then
        print_error "Application directory not found: $APP_DIR"
        exit 1
    fi
    
    # Check if application is built
    if [ ! -f "$APP_DIR/dist/index.js" ]; then
        print_warning "Application not built. Run 'pnpm build' first."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p "$APP_DIR/logs"
    mkdir -p "$APP_DIR/uploads"
    
    chown -R $USER:$GROUP "$APP_DIR/logs"
    chown -R $USER:$GROUP "$APP_DIR/uploads"
    
    print_success "Directories created"
}

# Function to install systemd services
install_services() {
    print_info "Installing systemd services..."
    
    # Copy service files
    cp "$APP_DIR/systemd/$APP_NAME.service" "$SYSTEMD_DIR/"
    cp "$APP_DIR/systemd/$HEALTH_MONITOR_NAME.service" "$SYSTEMD_DIR/"
    
    # Set correct permissions
    chmod 644 "$SYSTEMD_DIR/$APP_NAME.service"
    chmod 644 "$SYSTEMD_DIR/$HEALTH_MONITOR_NAME.service"
    
    # Reload systemd
    systemctl daemon-reload
    
    print_success "Service files installed"
}

# Function to enable and start services
enable_services() {
    print_info "Enabling and starting services..."
    
    # Enable services to start on boot
    systemctl enable "$APP_NAME.service"
    systemctl enable "$HEALTH_MONITOR_NAME.service"
    
    # Start services
    systemctl start "$APP_NAME.service"
    sleep 3  # Wait for app to start
    systemctl start "$HEALTH_MONITOR_NAME.service"
    
    print_success "Services enabled and started"
}

# Function to check service status
check_status() {
    print_info "Checking service status..."
    echo ""
    
    echo "=== $APP_NAME.service ==="
    systemctl status "$APP_NAME.service" --no-pager || true
    echo ""
    
    echo "=== $HEALTH_MONITOR_NAME.service ==="
    systemctl status "$HEALTH_MONITOR_NAME.service" --no-pager || true
    echo ""
}

# Function to uninstall services
uninstall_services() {
    print_info "Uninstalling systemd services..."
    
    # Stop services
    systemctl stop "$HEALTH_MONITOR_NAME.service" 2>/dev/null || true
    systemctl stop "$APP_NAME.service" 2>/dev/null || true
    
    # Disable services
    systemctl disable "$HEALTH_MONITOR_NAME.service" 2>/dev/null || true
    systemctl disable "$APP_NAME.service" 2>/dev/null || true
    
    # Remove service files
    rm -f "$SYSTEMD_DIR/$APP_NAME.service"
    rm -f "$SYSTEMD_DIR/$HEALTH_MONITOR_NAME.service"
    
    # Reload systemd
    systemctl daemon-reload
    systemctl reset-failed
    
    print_success "Services uninstalled"
}

# Function to restart services
restart_services() {
    print_info "Restarting services..."
    
    systemctl restart "$APP_NAME.service"
    sleep 3
    systemctl restart "$HEALTH_MONITOR_NAME.service"
    
    print_success "Services restarted"
}

# Function to show logs
show_logs() {
    print_info "Showing recent logs..."
    echo ""
    
    echo "=== $APP_NAME logs (last 50 lines) ==="
    journalctl -u "$APP_NAME.service" -n 50 --no-pager
    echo ""
    
    echo "=== $HEALTH_MONITOR_NAME logs (last 50 lines) ==="
    journalctl -u "$HEALTH_MONITOR_NAME.service" -n 50 --no-pager
    echo ""
}

# Function to display usage
usage() {
    cat << EOF
Usage: sudo $0 [COMMAND]

Commands:
    install     Install and start systemd services
    uninstall   Stop and remove systemd services
    restart     Restart both services
    status      Show service status
    logs        Show recent service logs
    help        Display this help message

Examples:
    sudo $0 install
    sudo $0 status
    sudo $0 restart
    sudo $0 logs

EOF
}

# Main script logic
main() {
    check_root
    
    case "${1:-}" in
        install)
            check_prerequisites
            create_directories
            install_services
            enable_services
            check_status
            print_success "Deployment complete!"
            print_info "Services are now running and will start automatically on boot"
            print_info "Use 'sudo systemctl status $APP_NAME' to check status"
            print_info "Use 'sudo journalctl -u $APP_NAME -f' to follow logs"
            ;;
        uninstall)
            uninstall_services
            print_success "Uninstallation complete!"
            ;;
        restart)
            restart_services
            check_status
            ;;
        status)
            check_status
            ;;
        logs)
            show_logs
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            print_error "Invalid command: ${1:-}"
            echo ""
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
