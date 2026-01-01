<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dynamic CRM System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card-hover {
            transition: all 0.3s ease;
        }
        .card-hover:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .feature-icon {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
    </style>
<base target="_blank">
</head>
<body class="gradient-bg min-h-screen">
    <!-- Navigation -->
    <nav class="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <i class="fas fa-users text-white text-lg"></i>
                    </div>
                    <span class="ml-3 text-white text-xl font-bold">Dynamic CRM</span>
                </div>
                <div class="hidden md:flex items-center space-x-6">
                    <a href="#features" class="text-white hover:text-blue-200 transition-colors">Features</a>
                    <a href="#dashboards" class="text-white hover:text-blue-200 transition-colors">Dashboards</a>
                    <a href="#technology" class="text-white hover:text-blue-200 transition-colors">Technology</a>
                    <a href="/login" class="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all">
                        <i class="fas fa-sign-in-alt mr-2"></i>Login
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="pt-20 pb-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <h1 class="text-5xl md:text-7xl font-bold text-white mb-6">
                    Dynamic CRM
                    <span class="block text-3xl md:text-4xl font-normal mt-2 opacity-90">Management System</span>
                </h1>
                <p class="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
                    Comprehensive committee management with role-based authentication, biometric attendance tracking, 
                    and advanced reporting capabilities. Built with modern web technologies for seamless user experience.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/login" class="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105">
                        <i class="fas fa-rocket mr-2"></i>Get Started
                    </a>
                    <a href="#features" class="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all">
                        <i class="fas fa-info-circle mr-2"></i>Learn More
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-16 bg-white/10 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-white mb-4">Powerful Features</h2>
                <p class="text-xl text-white/80 max-w-3xl mx-auto">
                    Everything you need for comprehensive committee management and attendance tracking
                </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Role-Based Authentication -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-shield-alt text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Role-Based Authentication</h3>
                    <p class="text-white/80">
                        Secure access control with four distinct roles: Admin, Committee Member, Committee Head, and General Secretary.
                    </p>
                </div>

                <!-- Biometric Attendance -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-fingerprint text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Biometric Attendance</h3>
                    <p class="text-white/80">
                        Advanced fingerprint scanning for accurate attendance tracking with real-time monitoring and reporting.
                    </p>
                </div>

                <!-- Committee Management -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-users-cog text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Committee Management</h3>
                    <p class="text-white/80">
                        Complete committee oversight with member tracking, performance analytics, and automated workflows.
                    </p>
                </div>

                <!-- Work Reports -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-clipboard-list text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Work Reports</h3>
                    <p class="text-white/80">
                        Submit and track work reports with file attachments, approval workflows, and comprehensive reporting.
                    </p>
                </div>

                <!-- Leave Management -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-calendar-alt text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Leave Management</h3>
                    <p class="text-white/80">
                        Streamlined leave application process with multi-level approval workflow and automated notifications.
                    </p>
                </div>

                <!-- Analytics & Reports -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-teal-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-chart-line text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Analytics & Reports</h3>
                    <p class="text-white/80">
                        Comprehensive analytics dashboard with real-time insights, performance metrics, and exportable reports.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Dashboards Section -->
    <section id="dashboards" class="py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-white mb-4">Tailored Dashboards</h2>
                <p class="text-xl text-white/80 max-w-3xl mx-auto">
                    Specialized interfaces designed for each user role with relevant features and insights
                </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- Admin Dashboard -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-crown text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Admin Dashboard</h3>
                    <p class="text-white/80 mb-4">
                        Complete system control with user management, biometric registration, and comprehensive analytics.
                    </p>
                    <ul class="text-white/70 text-sm space-y-1">
                        <li>• User & Profile Management</li>
                        <li>• Biometric Registration</li>
                        <li>• System Analytics</li>
                        <li>• Report Generation</li>
                    </ul>
                </div>

                <!-- Committee Head Dashboard -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-user-tie text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Head Dashboard</h3>
                    <p class="text-white/80 mb-4">
                        Committee oversight with member insights, leave approvals, and performance tracking.
                    </p>
                    <ul class="text-white/70 text-sm space-y-1">
                        <li>• Committee Insights</li>
                        <li>• Leave Approvals</li>
                        <li>• Member Tracking</li>
                        <li>• Performance Analytics</li>
                    </ul>
                </div>

                <!-- General Secretary Dashboard -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-user-shield text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">GS Dashboard</h3>
                    <p class="text-white/80 mb-4">
                        System-wide oversight with final approval authority and comprehensive reporting.
                    </p>
                    <ul class="text-white/70 text-sm space-y-1">
                        <li>• All Committees Overview</li>
                        <li>• Final Approvals</li>
                        <li>• System Monitoring</li>
                        <li>• Executive Reports</li>
                    </ul>
                </div>

                <!-- Member Dashboard -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 card-hover border border-white/20">
                    <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center mb-4">
                        <i class="fas fa-user text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-3">Member Dashboard</h3>
                    <p class="text-white/80 mb-4">
                        Personal workspace with profile management, attendance tracking, and report submission.
                    </p>
                    <ul class="text-white/70 text-sm space-y-1">
                        <li>• Profile Management</li>
                        <li>• Attendance Tracking</li>
                        <li>• Work Reports</li>
                        <li>• Leave Applications</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- Technology Section -->
    <section id="technology" class="py-16 bg-white/10 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-white mb-4">Modern Technology Stack</h2>
                <p class="text-xl text-white/80 max-w-3xl mx-auto">
                    Built with cutting-edge technologies for optimal performance, scalability, and user experience
                </p>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                <!-- Next.js -->
                <div class="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center border border-white/20">
                    <i class="fab fa-react text-4xl text-blue-400 mb-2"></i>
                    <p class="text-white font-semibold">Next.js</p>
                </div>

                <!-- TypeScript -->
                <div class="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center border border-white/20">
                    <i class="fas fa-code text-4xl text-blue-500 mb-2"></i>
                    <p class="text-white font-semibold">TypeScript</p>
                </div>

                <!-- Tailwind CSS -->
                <div class="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center border border-white/20">
                    <i class="fas fa-palette text-4xl text-teal-400 mb-2"></i>
                    <p class="text-white font-semibold">Tailwind</p>
                </div>

                <!-- Node.js -->
                <div class="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center border border-white/20">
                    <i class="fab fa-node-js text-4xl text-green-400 mb-2"></i>
                    <p class="text-white font-semibold">Node.js</p>
                </div>

                <!-- Express.js -->
                <div class="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center border border-white/20">
                    <i class="fas fa-server text-4xl text-yellow-400 mb-2"></i>
                    <p class="text-white font-semibold">Express</p>
                </div>

                <!-- PostgreSQL -->
                <div class="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center border border-white/20">
                    <i class="fas fa-database text-4xl text-blue-600 mb-2"></i>
                    <p class="text-white font-semibold">PostgreSQL</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Call to Action -->
    <section class="py-16">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-4xl font-bold text-white mb-6">Ready to Transform Your Committee Management?</h2>
            <p class="text-xl text-white/80 mb-8">
                Experience the power of modern CRM with biometric attendance, role-based access, and comprehensive analytics.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/login" class="bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all transform hover:scale-105">
                    <i class="fas fa-rocket mr-2"></i>Start Your Journey
                </a>
                <a href="https://github.com" target="_blank" class="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-purple-600 transition-all">
                    <i class="fab fa-github mr-2"></i>View on GitHub
                </a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-black/30 backdrop-blur-md border-t border-white/20 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <div class="flex items-center justify-center mb-4">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <i class="fas fa-users text-white text-lg"></i>
                    </div>
                    <span class="ml-3 text-white text-xl font-bold">Dynamic CRM</span>
                </div>
                <p class="text-white/60 mb-4">
                    Advanced Committee Management System with Biometric Attendance Tracking
                </p>
                <p class="text-white/40 text-sm">
                    © 2024 Dynamic CRM System. Built with modern web technologies for optimal performance.
                </p>
            </div>
        </div>
    </footer>

    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

        // Add scroll effect to navigation
        window.addEventListener('scroll', function() {
            const nav = document.querySelector('nav');
            if (window.scrollY > 50) {
                nav.classList.add('bg-white/20');
            } else {
                nav.classList.remove('bg-white/20');
            }
        });
    </script>
</body>
</html>